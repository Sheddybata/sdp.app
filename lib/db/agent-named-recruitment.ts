import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashStateRecruitmentCode,
  normalizeStateRecruitmentCode,
} from "@/lib/agent-recruitment";
import { titleCaseStateName } from "@/lib/inec-states";

export type NamedCodeStatus = "active" | "revoked";

export interface AgentNamedRecruitmentCode {
  id: string;
  slug: string;
  label: string;
  stateId: string;
  stateName: string;
  status: NamedCodeStatus;
  hasCode: boolean;
  codeGeneratedAt: string | null;
  updatedAt: string;
  createdAt: string;
  registrationCount: number;
}

type NamedRow = {
  id: string;
  slug: string;
  label: string;
  state_id: string;
  state_name: string;
  code_hash: string | null;
  status: NamedCodeStatus;
  code_generated_at: string | null;
  updated_at: string;
  created_at: string;
};

function toNamed(r: NamedRow, registrationCount = 0): AgentNamedRecruitmentCode {
  return {
    id: r.id,
    slug: r.slug,
    label: r.label,
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

export async function listNamedRecruitmentCodes(): Promise<AgentNamedRecruitmentCode[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_named_recruitment_codes")
    .select("id,slug,label,state_id,state_name,code_hash,status,code_generated_at,updated_at,created_at")
    .order("label", { ascending: true });
  if (error || !data) {
    console.error("[named codes] list failed:", error);
    return [];
  }

  const rows = data as NamedRow[];
  const counts = new Map<string, number>();
  const { data: countRows, error: countError } = await supabase
    .from("agent_registrations")
    .select("named_recruitment_code_id");
  if (countError) {
    console.error("[named codes] count failed:", countError);
  } else {
    for (const row of (countRows ?? []) as { named_recruitment_code_id: string | null }[]) {
      const id = row.named_recruitment_code_id;
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return rows.map((r) => toNamed(r, counts.get(r.id) ?? 0));
}

export async function findActiveNamedCodeByPlain(plainCode: string): Promise<{
  id: string;
  slug: string;
  label: string;
  stateId: string;
  stateName: string;
} | null> {
  const normalized = normalizeStateRecruitmentCode(plainCode);
  if (normalized.length < 6) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;

  const codeHash = hashStateRecruitmentCode(normalized);
  const { data, error } = await supabase
    .from("agent_named_recruitment_codes")
    .select("id,slug,label,state_id,state_name,code_hash,status")
    .eq("status", "active")
    .eq("code_hash", codeHash)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    slug: data.slug as string,
    label: data.label as string,
    stateId: data.state_id as string,
    stateName: data.state_name as string,
  };
}

export async function setNamedCodeHash(args: {
  slug: string;
  codeHash: string;
  status: NamedCodeStatus;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false };
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("agent_named_recruitment_codes")
    .update({
      code_hash: args.codeHash,
      status: args.status,
      code_generated_at: now,
      updated_at: now,
    })
    .eq("slug", args.slug)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[named codes] set hash failed:", error);
    return { ok: false };
  }
  return { ok: true, id: data.id as string };
}

export async function revokeNamedCode(slug: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("agent_named_recruitment_codes")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) {
    console.error("[named codes] revoke failed:", error);
    return false;
  }
  return true;
}

export function formatStateCodeLabel(stateName: string): string {
  return `${titleCaseStateName(stateName)} state code`;
}
