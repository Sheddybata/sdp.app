import { createAdminClient } from "@/lib/supabase/admin";
import { hashAroCode, normalizeAroCode } from "@/lib/agent-recruitment";

export type AroStatus = "active" | "revoked";

export interface AgentRecruitmentOfficer {
  id: string;
  officerNumber: number;
  label: string;
  status: AroStatus;
  hasCode: boolean;
  codeGeneratedAt: string | null;
  updatedAt: string;
  createdAt: string;
  /** Count of agent_registrations stamped with this officer (all statuses). */
  registrationCount: number;
}

type OfficerRow = {
  id: string;
  officer_number: number;
  label: string;
  code_hash: string | null;
  status: AroStatus;
  code_generated_at: string | null;
  updated_at: string;
  created_at: string;
};

function toOfficer(r: OfficerRow, registrationCount = 0): AgentRecruitmentOfficer {
  return {
    id: r.id,
    officerNumber: r.officer_number,
    label: r.label,
    status: r.status,
    hasCode: !!(r.code_hash && r.code_hash.length > 0),
    codeGeneratedAt: r.code_generated_at,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
    registrationCount,
  };
}

export async function listRecruitmentOfficers(): Promise<AgentRecruitmentOfficer[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_recruitment_officers")
    .select("id,officer_number,label,code_hash,status,code_generated_at,updated_at,created_at")
    .order("officer_number", { ascending: true });
  if (error || !data) {
    console.error("[ARO] list officers failed:", error);
    return [];
  }

  const rows = data as OfficerRow[];
  const counts = new Map<number, number>();
  const { data: countRows, error: countError } = await supabase
    .from("agent_registrations")
    .select("aro_officer_number");
  if (countError) {
    console.error("[ARO] count registrations failed:", countError);
  } else {
    for (const row of (countRows ?? []) as { aro_officer_number: number | null }[]) {
      const n = row.aro_officer_number;
      if (n == null) continue;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
  }

  return rows.map((r) => toOfficer(r, counts.get(r.officer_number) ?? 0));
}

export async function findActiveAroByCode(
  plainCode: string
): Promise<{ id: string; officerNumber: number; label: string } | null> {
  const normalized = normalizeAroCode(plainCode);
  if (normalized.length < 6) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;

  const codeHash = hashAroCode(normalized);
  const { data, error } = await supabase
    .from("agent_recruitment_officers")
    .select("id,officer_number,label,code_hash,status")
    .eq("status", "active")
    .eq("code_hash", codeHash)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    officerNumber: data.officer_number as number,
    label: data.label as string,
  };
}

export async function setAroCodeHash(args: {
  officerNumber: number;
  codeHash: string;
  status: AroStatus;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false };
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("agent_recruitment_officers")
    .update({
      code_hash: args.codeHash,
      status: args.status,
      code_generated_at: now,
      updated_at: now,
    })
    .eq("officer_number", args.officerNumber)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[ARO] set code failed:", error);
    return { ok: false };
  }
  return { ok: true, id: data.id as string };
}

export async function revokeAro(officerNumber: number): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("agent_recruitment_officers")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("officer_number", officerNumber);
  if (error) {
    console.error("[ARO] revoke failed:", error);
    return false;
  }
  return true;
}

/** Registrations per ARO and per state (for admin monitoring). */
export async function getAroRegistrationStats(): Promise<{
  byAro: { officerNumber: number; label: string; total: number; pending: number; approved: number; rejected: number }[];
  byState: {
    stateId: string;
    stateName: string;
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byAro: Record<number, number>;
  }[];
}> {
  const empty = { byAro: [], byState: [] };
  const supabase = createAdminClient();
  if (!supabase) return empty;

  const officers = await listRecruitmentOfficers();
  const { data, error } = await supabase
    .from("agent_registrations")
    .select(
      "assigned_state_id,assigned_state_name,aro_officer_number,portal_users(status)"
    );
  if (error || !data) {
    console.error("[ARO] stats failed:", error);
    return empty;
  }

  type StatRow = {
    assigned_state_id: string;
    assigned_state_name: string;
    aro_officer_number: number | null;
    portal_users?: { status?: string } | null;
  };

  const aroAgg = new Map<number, { total: number; pending: number; approved: number; rejected: number }>();
  for (let i = 1; i <= 5; i++) aroAgg.set(i, { total: 0, pending: 0, approved: 0, rejected: 0 });

  const stateAgg = new Map<
    string,
    {
      stateId: string;
      stateName: string;
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      byAro: Record<number, number>;
    }
  >();

  for (const raw of data as StatRow[]) {
    const status = (raw.portal_users?.status as string) || "pending";
    const aro = raw.aro_officer_number;
    if (aro != null && aroAgg.has(aro)) {
      const a = aroAgg.get(aro)!;
      a.total += 1;
      if (status === "approved") a.approved += 1;
      else if (status === "rejected") a.rejected += 1;
      else a.pending += 1;
    }

    const sid = raw.assigned_state_id || "unknown";
    let s = stateAgg.get(sid);
    if (!s) {
      s = {
        stateId: sid,
        stateName: raw.assigned_state_name || sid,
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        byAro: {},
      };
      stateAgg.set(sid, s);
    }
    s.total += 1;
    if (status === "approved") s.approved += 1;
    else if (status === "rejected") s.rejected += 1;
    else s.pending += 1;
    if (aro != null) s.byAro[aro] = (s.byAro[aro] ?? 0) + 1;
  }

  const labelFor = (n: number) => officers.find((o) => o.officerNumber === n)?.label ?? `ARO ${n}`;

  return {
    byAro: [1, 2, 3, 4, 5].map((n) => ({
      officerNumber: n,
      label: labelFor(n),
      ...aroAgg.get(n)!,
    })),
    byState: Array.from(stateAgg.values()).sort((a, b) => b.total - a.total || a.stateName.localeCompare(b.stateName)),
  };
}
