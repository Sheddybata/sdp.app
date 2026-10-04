import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentLevel, LocationPick } from "@/lib/agent-registration-schema";
import { ADMIN_LIST_MAX_TOTAL_ROWS, POSTGREST_PAGE_SIZE } from "@/lib/db/admin-list-limits";

export type PortalUserStatus = "pending" | "approved" | "rejected";

export interface AgentRegistrationInsert {
  member_id: string;
  agent_level: AgentLevel;
  assigned_state_id: string;
  assigned_state_name: string;
  assigned_lga_id: string | null;
  assigned_lga_name: string | null;
  assigned_ward_id: string | null;
  assigned_ward_name: string | null;
  assigned_polling_unit_name: string | null;
  assigned_code: string | null;
  first_name: string;
  middle_name: string | null;
  surname: string;
  phone: string;
  email: string;
  nin: string;
  voter_identification_number: string;
  sdp_membership_id: string;
  agent_polling_unit: LocationPick;
  agent_voting_unit: LocationPick;
  polling_unit: LocationPick;
  photo_data_url: string;
  membership_id_card_data_url: string;
  pvc_data_url: string;
  acknowledged_at: string;
}

export interface AgentRegistrationRecord {
  id: string;
  userId: string;
  /** Linked SDP member record; null for registrations made before the member check. */
  memberId: string | null;
  status: PortalUserStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  agentLevel: AgentLevel;
  assignedStateId: string;
  assignedLgaId: string | null;
  assignedWardId: string | null;
  assignedStateName: string;
  assignedLgaName: string | null;
  assignedWardName: string | null;
  assignedPollingUnitName: string | null;
  assignedCode: string | null;
  firstName: string;
  middleName: string | null;
  surname: string;
  phone: string;
  email: string;
  /** Null for registrations made before NIN was collected. */
  nin: string | null;
  voterIdentificationNumber: string;
  sdpMembershipId: string;
  agentPollingUnit: LocationPick;
  agentVotingUnit: LocationPick;
  pollingUnit: LocationPick;
  /** Null in list results; loaded when a single registration is opened. */
  photoDataUrl: string | null;
  membershipIdCardDataUrl: string | null;
  pvcDataUrl: string | null;
  acknowledgedAt: string;
  createdAt: string;
}

/** List view — excludes the three base64 document columns. */
const LIST_COLUMNS =
  "id,user_id,member_id,agent_level,assigned_state_id,assigned_lga_id,assigned_ward_id,assigned_state_name,assigned_lga_name,assigned_ward_name,assigned_polling_unit_name,assigned_code,first_name,middle_name,surname,phone,email,nin,voter_identification_number,sdp_membership_id,agent_polling_unit,agent_voting_unit,polling_unit,acknowledged_at,created_at,portal_users(status,reviewed_at,review_note)";

const DETAIL_COLUMNS = `${LIST_COLUMNS},photo_data_url,membership_id_card_data_url,pvc_data_url`;

type Row = Record<string, unknown> & {
  portal_users?: { status?: string; reviewed_at?: string | null; review_note?: string | null } | null;
};

function rowToRecord(r: Row): AgentRegistrationRecord {
  const pu = r.portal_users ?? null;
  const str = (k: string) => (r[k] as string | null) ?? null;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    memberId: str("member_id"),
    status: ((pu?.status as PortalUserStatus) ?? "pending"),
    reviewedAt: pu?.reviewed_at ?? null,
    reviewNote: pu?.review_note ?? null,
    agentLevel: r.agent_level as AgentLevel,
    assignedStateId: r.assigned_state_id as string,
    assignedLgaId: str("assigned_lga_id"),
    assignedWardId: str("assigned_ward_id"),
    assignedStateName: r.assigned_state_name as string,
    assignedLgaName: str("assigned_lga_name"),
    assignedWardName: str("assigned_ward_name"),
    assignedPollingUnitName: str("assigned_polling_unit_name"),
    assignedCode: str("assigned_code"),
    firstName: r.first_name as string,
    middleName: str("middle_name"),
    surname: r.surname as string,
    phone: r.phone as string,
    email: r.email as string,
    nin: str("nin"),
    voterIdentificationNumber: r.voter_identification_number as string,
    sdpMembershipId: r.sdp_membership_id as string,
    agentPollingUnit: r.agent_polling_unit as LocationPick,
    agentVotingUnit: r.agent_voting_unit as LocationPick,
    pollingUnit: r.polling_unit as LocationPick,
    photoDataUrl: str("photo_data_url"),
    membershipIdCardDataUrl: str("membership_id_card_data_url"),
    pvcDataUrl: str("pvc_data_url"),
    acknowledgedAt: r.acknowledged_at as string,
    createdAt: r.created_at as string,
  };
}

/**
 * Create a pending agent login (portal_users) plus the registration details.
 * Removes the login row again if the details insert fails.
 */
export async function createAgentRegistration(args: {
  fullName: string;
  phone: string;
  email: string;
  passwordHash: string;
  registration: AgentRegistrationInsert;
}): Promise<
  { ok: true; id: string } | { ok: false; error: "email_taken" | "nin_taken" | "member_taken" | "unavailable" }
> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "unavailable" };

  const email = args.email.trim().toLowerCase();

  const { data: userRow, error: userError } = await supabase
    .from("portal_users")
    .insert({
      role: "agent",
      full_name: args.fullName.trim(),
      phone: args.phone.trim(),
      email,
      password_hash: args.passwordHash,
      status: "pending",
    })
    .select("id")
    .single();

  if (userError || !userRow) {
    const msg = String(userError?.message || "").toLowerCase();
    if (userError?.code === "23505" || msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "email_taken" };
    }
    console.error("[agent registration] insert portal user failed:", userError);
    return { ok: false, error: "unavailable" };
  }

  const userId = userRow.id as string;

  const { data: regRow, error: regError } = await supabase
    .from("agent_registrations")
    .insert({ ...args.registration, user_id: userId })
    .select("id")
    .single();

  if (regError || !regRow) {
    await supabase.from("portal_users").delete().eq("id", userId);
    const detail = `${regError?.message ?? ""} ${regError?.details ?? ""}`.toLowerCase();
    if (regError?.code === "23505" && detail.includes("member_id")) {
      return { ok: false, error: "member_taken" };
    }
    if (regError?.code === "23505" && detail.includes("nin")) {
      return { ok: false, error: "nin_taken" };
    }
    console.error("[agent registration] insert details failed:", regError);
    return { ok: false, error: "unavailable" };
  }

  return { ok: true, id: regRow.id as string };
}

export async function listAgentRegistrations(): Promise<AgentRegistrationRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const acc: AgentRegistrationRecord[] = [];
  for (let from = 0; acc.length < ADMIN_LIST_MAX_TOTAL_ROWS; from += POSTGREST_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("agent_registrations")
      .select(LIST_COLUMNS)
      .order("created_at", { ascending: false })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    if (error) {
      console.error("[ADMIN] agent registrations list error:", error);
      return acc;
    }
    const rows = (data ?? []) as unknown as Row[];
    for (const r of rows) acc.push(rowToRecord(r));
    if (rows.length < POSTGREST_PAGE_SIZE) break;
  }
  return acc;
}

export async function getAgentRegistrationById(id: string): Promise<AgentRegistrationRecord | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agent_registrations")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[ADMIN] agent registration detail error:", error);
    return null;
  }
  if (!data) return null;
  return rowToRecord(data as unknown as Row);
}

/** The signed-in agent's own registration (no document images). */
export async function getAgentRegistrationByUserId(userId: string): Promise<AgentRegistrationRecord | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agent_registrations")
    .select(LIST_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[agent registration] by user failed:", error);
    return null;
  }
  return data ? rowToRecord(data as unknown as Row) : null;
}

export async function agentExistsForMember(memberId: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("agent_registrations")
    .select("id")
    .eq("member_id", memberId)
    .limit(1);
  if (error) {
    console.error("[agent registration] member check failed:", error);
    return false;
  }
  return (data ?? []).length > 0;
}

/** Passport photos only, for ID card generation. */
export async function getAgentPhotosByIds(ids: string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  if (ids.length === 0) return out;
  const supabase = createAdminClient();
  if (!supabase) return out;
  const { data, error } = await supabase
    .from("agent_registrations")
    .select("id,photo_data_url")
    .in("id", ids);
  if (error) {
    console.error("[ADMIN] agent photos error:", error);
    return out;
  }
  for (const row of (data ?? []) as { id: string; photo_data_url: string | null }[]) {
    out[row.id] = row.photo_data_url ?? null;
  }
  return out;
}

export async function setPortalUserStatus(args: {
  userId: string;
  status: PortalUserStatus;
  note?: string | null;
}): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("portal_users")
    .update({
      status: args.status,
      reviewed_at: new Date().toISOString(),
      review_note: args.note?.trim() || null,
    })
    .eq("id", args.userId)
    .eq("role", "agent");
  if (error) {
    console.error("[ADMIN] set agent status failed:", error);
    return false;
  }
  return true;
}
