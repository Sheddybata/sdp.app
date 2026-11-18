import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashStateRecruitmentCode,
  normalizeStateRecruitmentCode,
} from "@/lib/agent-recruitment";
import { INEC_STATES, titleCaseStateName } from "@/lib/inec-states";

export type StateCodeStatus = "active" | "revoked";

export interface AgentStateRecruitmentCode {
  id: string;
  stateId: string;
  stateName: string;
  status: StateCodeStatus;
  hasCode: boolean;
  codeGeneratedAt: string | null;
  updatedAt: string;
  createdAt: string;
  registrationCount: number;
}

type StateCodeRow = {
  id: string;
  state_id: string;
  state_name: string;
  code_hash: string | null;
  status: StateCodeStatus;
  code_generated_at: string | null;
  updated_at: string;
  created_at: string;
};

function toCode(r: StateCodeRow, registrationCount = 0): AgentStateRecruitmentCode {
  return {
    id: r.id,
    stateId: r.state_id,
    stateName: r.state_name,
    status: r.status,
    hasCode: !!(r.code_hash && r.code_hash.length > 0),
    codeGeneratedAt: r.code_generated_at,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
    registrationCount,
  };
}

export async function listStateRecruitmentCodes(): Promise<AgentStateRecruitmentCode[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_state_recruitment_codes")
    .select("id,state_id,state_name,code_hash,status,code_generated_at,updated_at,created_at")
    .order("state_name", { ascending: true });
  if (error || !data) {
    console.error("[state codes] list failed:", error);
    return [];
  }

  const rows = data as StateCodeRow[];
  const counts = new Map<string, number>();
  const { data: countRows, error: countError } = await supabase
    .from("agent_registrations")
    .select("state_recruitment_code_id");
  if (countError) {
    console.error("[state codes] count failed:", countError);
  } else {
    for (const row of (countRows ?? []) as { state_recruitment_code_id: string | null }[]) {
      const id = row.state_recruitment_code_id;
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  // Ensure all INEC states appear even if seed missed one.
  const byState = new Map(rows.map((r) => [r.state_id, r]));
  const ordered = INEC_STATES.map((s) => {
    const row = byState.get(s.id);
    if (row) return toCode(row, counts.get(row.id) ?? 0);
    return {
      id: "",
      stateId: s.id,
      stateName: s.name,
      status: "revoked" as const,
      hasCode: false,
      codeGeneratedAt: null,
      updatedAt: "",
      createdAt: "",
      registrationCount: 0,
    };
  });
  return ordered;
}

export async function findActiveStateCodeByPlain(
  plainCode: string
): Promise<{ id: string; stateId: string; stateName: string; label: string } | null> {
  const normalized = normalizeStateRecruitmentCode(plainCode);
  if (normalized.length < 6) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;

  const codeHash = hashStateRecruitmentCode(normalized);
  const { data, error } = await supabase
    .from("agent_state_recruitment_codes")
    .select("id,state_id,state_name,code_hash,status")
    .eq("status", "active")
    .eq("code_hash", codeHash)
    .maybeSingle();
  if (error || !data) return null;
  const stateName = data.state_name as string;
  return {
    id: data.id as string,
    stateId: data.state_id as string,
    stateName,
    label: `${titleCaseStateName(stateName)} state code`,
  };
}

export async function setStateCodeHash(args: {
  stateId: string;
  codeHash: string;
  status: StateCodeStatus;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false };
  const meta = INEC_STATES.find((s) => s.id === args.stateId);
  if (!meta) return { ok: false };
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("agent_state_recruitment_codes")
    .select("id")
    .eq("state_id", args.stateId)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("agent_state_recruitment_codes")
      .update({
        code_hash: args.codeHash,
        status: args.status,
        code_generated_at: now,
        updated_at: now,
        state_name: meta.name,
      })
      .eq("state_id", args.stateId)
      .select("id")
      .single();
    if (error || !data) {
      console.error("[state codes] update failed:", error);
      return { ok: false };
    }
    return { ok: true, id: data.id as string };
  }

  const { data, error } = await supabase
    .from("agent_state_recruitment_codes")
    .insert({
      state_id: args.stateId,
      state_name: meta.name,
      code_hash: args.codeHash,
      status: args.status,
      code_generated_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[state codes] insert failed:", error);
    return { ok: false };
  }
  return { ok: true, id: data.id as string };
}

export async function revokeStateCode(stateId: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("agent_state_recruitment_codes")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("state_id", stateId);
  if (error) {
    console.error("[state codes] revoke failed:", error);
    return false;
  }
  return true;
}
