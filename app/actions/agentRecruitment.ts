"use server";

import { isAuthenticated } from "@/app/actions/auth";
import { generateShortAroCode, hashAroCode, normalizeAroCode } from "@/lib/agent-recruitment";
import {
  findActiveAroByCode,
  getAroRegistrationStats,
  listRecruitmentOfficers,
  revokeAro,
  setAroCodeHash,
  type AgentRecruitmentOfficer,
} from "@/lib/db/agent-recruitment";

export type VerifyAroResult =
  | { ok: true; officerNumber: number; label: string }
  | { ok: false; error: string };

/** Public: unlock agent apply with an ARO recruitment code. */
export async function verifyAgentRecruitmentCode(code: string): Promise<VerifyAroResult> {
  if (typeof code !== "string" || !code.trim()) {
    return { ok: false, error: "Enter the recruitment code from your Agent Registration Officer." };
  }
  const found = await findActiveAroByCode(code);
  if (!found) {
    return {
      ok: false,
      error: "That recruitment code is invalid or has been revoked. Ask your Agent Registration Officer.",
    };
  }
  return { ok: true, officerNumber: found.officerNumber, label: found.label };
}

export async function adminListRecruitmentOfficers(): Promise<AgentRecruitmentOfficer[]> {
  const authed = await isAuthenticated();
  if (!authed) return [];
  return listRecruitmentOfficers();
}

export async function adminGetAroStats() {
  const authed = await isAuthenticated();
  if (!authed) return { byAro: [], byState: [] };
  return getAroRegistrationStats();
}

export type AroCodeResult =
  | { ok: true; plainCode: string; officerNumber: number }
  | { ok: false; error: string };

/** Generate or rotate the multi-use code for one ARO. Plaintext shown once. */
export async function adminRotateAroCode(officerNumber: number): Promise<AroCodeResult> {
  const authed = await isAuthenticated();
  if (!authed) return { ok: false, error: "Unauthorized." };
  if (!Number.isInteger(officerNumber) || officerNumber < 1 || officerNumber > 5) {
    return { ok: false, error: "Invalid officer." };
  }

  const plainCode = generateShortAroCode(officerNumber);
  const codeHash = hashAroCode(normalizeAroCode(plainCode));
  const saved = await setAroCodeHash({ officerNumber, codeHash, status: "active" });
  if (!saved.ok) return { ok: false, error: "Could not save the new code. Try again." };
  return { ok: true, plainCode, officerNumber };
}

export async function adminRevokeAroCode(
  officerNumber: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const authed = await isAuthenticated();
  if (!authed) return { ok: false, error: "Unauthorized." };
  if (!Number.isInteger(officerNumber) || officerNumber < 1 || officerNumber > 5) {
    return { ok: false, error: "Invalid officer." };
  }
  const ok = await revokeAro(officerNumber);
  if (!ok) return { ok: false, error: "Could not revoke the code. Try again." };
  return { ok: true };
}

/** Generate codes for every ARO that has none yet. Returns plaintext for those created. */
export async function adminGenerateMissingAroCodes(): Promise<
  | { ok: true; codes: { officerNumber: number; plainCode: string }[] }
  | { ok: false; error: string }
> {
  const authed = await isAuthenticated();
  if (!authed) return { ok: false, error: "Unauthorized." };

  const officers = await listRecruitmentOfficers();
  const codes: { officerNumber: number; plainCode: string }[] = [];
  for (const o of officers) {
    if (o.hasCode && o.status === "active") continue;
    const plainCode = generateShortAroCode(o.officerNumber);
    const codeHash = hashAroCode(normalizeAroCode(plainCode));
    const saved = await setAroCodeHash({
      officerNumber: o.officerNumber,
      codeHash,
      status: "active",
    });
    if (!saved.ok) return { ok: false, error: `Could not generate code for ARO ${o.officerNumber}.` };
    codes.push({ officerNumber: o.officerNumber, plainCode });
  }
  return { ok: true, codes };
}
