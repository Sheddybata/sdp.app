"use server";

import { isAuthenticated } from "@/app/actions/auth";
import {
  generateShortAroCode,
  generateShortStateCode,
  hashAroCode,
  hashStateRecruitmentCode,
  normalizeAroCode,
  normalizeStateRecruitmentCode,
} from "@/lib/agent-recruitment";
import {
  findActiveAroByCode,
  getAroRegistrationStats,
  listRecruitmentOfficers,
  revokeAro,
  setAroCodeHash,
  type AgentRecruitmentOfficer,
} from "@/lib/db/agent-recruitment";
import {
  findActiveStateCodeByPlain,
  listStateRecruitmentCodes,
  revokeStateCode,
  setStateCodeHash,
  type AgentStateRecruitmentCode,
} from "@/lib/db/agent-state-recruitment";
import { findInecState } from "@/lib/inec-states";

export type VerifyAroResult =
  | { ok: true; kind: "aro"; officerNumber: number; label: string }
  | {
      ok: true;
      kind: "state";
      stateId: string;
      stateName: string;
      label: string;
    }
  | { ok: false; error: string };

/** Public: unlock agent apply with an ARO or independent state recruitment code. */
export async function verifyAgentRecruitmentCode(code: string): Promise<VerifyAroResult> {
  if (typeof code !== "string" || !code.trim()) {
    return { ok: false, error: "Enter the recruitment code from your Agent Registration Officer." };
  }
  const aro = await findActiveAroByCode(code);
  if (aro) {
    return { ok: true, kind: "aro", officerNumber: aro.officerNumber, label: aro.label };
  }
  const state = await findActiveStateCodeByPlain(code);
  if (state) {
    return {
      ok: true,
      kind: "state",
      stateId: state.stateId,
      stateName: state.stateName,
      label: state.label,
    };
  }
  return {
    ok: false,
    error: "That recruitment code is invalid or has been revoked. Ask your Agent Registration Officer.",
  };
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

export async function adminListStateRecruitmentCodes(): Promise<AgentStateRecruitmentCode[]> {
  const authed = await isAuthenticated();
  if (!authed) return [];
  return listStateRecruitmentCodes();
}

export type StateCodeResult =
  | { ok: true; plainCode: string; stateId: string; stateName: string }
  | { ok: false; error: string };

export async function adminRotateStateCode(stateId: string): Promise<StateCodeResult> {
  const authed = await isAuthenticated();
  if (!authed) return { ok: false, error: "Unauthorized." };
  const meta = findInecState(stateId);
  if (!meta) return { ok: false, error: "Invalid state." };

  const plainCode = generateShortStateCode(stateId);
  const codeHash = hashStateRecruitmentCode(normalizeStateRecruitmentCode(plainCode));
  const saved = await setStateCodeHash({ stateId, codeHash, status: "active" });
  if (!saved.ok) return { ok: false, error: "Could not save the new code. Try again." };
  return { ok: true, plainCode, stateId, stateName: meta.name };
}

export async function adminRevokeStateCode(
  stateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const authed = await isAuthenticated();
  if (!authed) return { ok: false, error: "Unauthorized." };
  if (!findInecState(stateId)) return { ok: false, error: "Invalid state." };
  const ok = await revokeStateCode(stateId);
  if (!ok) return { ok: false, error: "Could not revoke the code. Try again." };
  return { ok: true };
}

/** Generate codes for every state that has none active yet. */
export async function adminGenerateMissingStateCodes(): Promise<
  | { ok: true; codes: { stateId: string; stateName: string; plainCode: string }[] }
  | { ok: false; error: string }
> {
  const authed = await isAuthenticated();
  if (!authed) return { ok: false, error: "Unauthorized." };

  const rows = await listStateRecruitmentCodes();
  const codes: { stateId: string; stateName: string; plainCode: string }[] = [];
  for (const row of rows) {
    if (row.hasCode && row.status === "active") continue;
    const plainCode = generateShortStateCode(row.stateId);
    const codeHash = hashStateRecruitmentCode(normalizeStateRecruitmentCode(plainCode));
    const saved = await setStateCodeHash({
      stateId: row.stateId,
      codeHash,
      status: "active",
    });
    if (!saved.ok) return { ok: false, error: `Could not generate code for ${row.stateName}.` };
    codes.push({ stateId: row.stateId, stateName: row.stateName, plainCode });
  }
  return { ok: true, codes };
}
