"use server";

import {
  getConstituencyByCode,
  listFederalConstituencies,
  listSenatorialDistricts,
  listStateAssemblyConstituencies,
  listUnmappedConstituencies,
  readManualLinks,
  writeManualLinks,
  type ConstituencySeat,
  type UnmappedSeat,
} from "@/lib/constituency-data";
import type { AgentLevel } from "@/lib/agent-registration-schema";
import { isConstituencyAgentLevel } from "@/lib/agent-registration-schema";

export async function listConstituenciesForLevel(
  level: AgentLevel,
  stateId: string
): Promise<ConstituencySeat[]> {
  if (!stateId?.trim()) return [];
  if (level === "senatorial") return listSenatorialDistricts(stateId);
  if (level === "house_of_reps") return listFederalConstituencies(stateId);
  if (level === "state_assembly") return listStateAssemblyConstituencies(stateId);
  return [];
}

export async function verifyConstituencyAssignment(args: {
  level: AgentLevel;
  stateId: string;
  code: string;
}): Promise<{ ok: true; seat: ConstituencySeat } | { ok: false; error: string }> {
  if (!isConstituencyAgentLevel(args.level)) {
    return { ok: false, error: "Not a constituency agent level." };
  }
  const seat = getConstituencyByCode(args.code);
  if (!seat) return { ok: false, error: "Unknown constituency code." };
  if (seat.stateId.toLowerCase() !== args.stateId.toLowerCase()) {
    return { ok: false, error: "That constituency is not in the selected state." };
  }
  const kindOk =
    (args.level === "senatorial" && seat.code.startsWith("SD/")) ||
    (args.level === "house_of_reps" && seat.code.startsWith("FC/")) ||
    (args.level === "state_assembly" && seat.code.startsWith("SC/"));
  if (!kindOk) return { ok: false, error: "Constituency type does not match the agent level." };
  return { ok: true, seat };
}

export async function getUnmappedConstituenciesAction(): Promise<UnmappedSeat[]> {
  return listUnmappedConstituencies();
}

export async function getManualConstituencyLinksAction() {
  return readManualLinks();
}

export async function saveManualConstituencyLink(args: {
  code: string;
  wardLocationCodes: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = args.code.trim();
  if (!code) return { ok: false, error: "Missing constituency code." };
  const file = readManualLinks();
  const links = { ...(file.links || {}) };
  links[code] = args.wardLocationCodes.map((c) => c.trim()).filter(Boolean);
  try {
    writeManualLinks({
      _comment:
        file._comment ||
        "Map constituency code → array of ward location codes (e.g. 37/01/01). Re-run npm run extract-constituencies after edits to rebuild full ward metadata.",
      links,
    });
    // Apply immediately into constituency_links / unmapped for this process & disk
    const { applyManualLinkToRuntimeFiles } = await import("@/lib/constituency-data");
    applyManualLinkToRuntimeFiles(code, links[code] as string[]);
    return { ok: true };
  } catch (err) {
    console.error("[constituencies] save manual link failed:", err);
    return { ok: false, error: "Could not save mapping on this server." };
  }
}
