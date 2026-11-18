import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentLevel, LocationPick } from "@/lib/agent-registration-schema";
import { ADMIN_LIST_MAX_TOTAL_ROWS, POSTGREST_PAGE_SIZE } from "@/lib/db/admin-list-limits";
import { normalizePhone } from "@/lib/otp/termii";

export type PortalUserStatus = "pending" | "approved" | "rejected";

export interface AgentRegistrationInsert {
  member_id: string | null;
  aro_id: string | null;
  aro_officer_number: number | null;
  agent_level: AgentLevel;
  assigned_state_id: string;
  assigned_state_name: string;
  assigned_lga_id: string | null;
  assigned_lga_name: string | null;
  assigned_ward_id: string | null;
  assigned_ward_name: string | null;
  assigned_polling_unit_name: string | null;
  assigned_code: string | null;
  assigned_constituency_code: string | null;
  assigned_constituency_name: string | null;
  first_name: string;
  middle_name: string | null;
  surname: string;
  gender?: string | null;
  phone: string;
  email: string | null;
  nin: string | null;
  voter_identification_number: string | null;
  sdp_membership_id: string | null;
  agent_polling_unit: LocationPick | null;
  agent_voting_unit: LocationPick | null;
  polling_unit: LocationPick | null;
  photo_data_url: string;
  membership_id_card_data_url: string | null;
  pvc_data_url: string | null;
  acknowledged_at: string;
}

export interface AgentRegistrationRecord {
  id: string;
  userId: string;
  /** Linked SDP member record; null for registrations made before the member check. */
  memberId: string | null;
  aroId: string | null;
  aroOfficerNumber: number | null;
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
  assignedConstituencyCode: string | null;
  assignedConstituencyName: string | null;
  firstName: string;
  middleName: string | null;
  surname: string;
  phone: string;
  email: string | null;
  gender: string | null;
  /** Null when not collected (slim apply) or for older rows without NIN. */
  nin: string | null;
  voterIdentificationNumber: string | null;
  /** Null when not collected (slim apply). */
  sdpMembershipId: string | null;
  agentPollingUnit: LocationPick | null;
  agentVotingUnit: LocationPick | null;
  pollingUnit: LocationPick | null;
  /** Null in list results; loaded when a single registration is opened. */
  photoDataUrl: string | null;
  membershipIdCardDataUrl: string | null;
  pvcDataUrl: string | null;
  acknowledgedAt: string;
  createdAt: string;
}

/** List view — excludes the three base64 document columns. */
const LIST_COLUMNS =
  "id,user_id,member_id,aro_id,aro_officer_number,agent_level,assigned_state_id,assigned_lga_id,assigned_ward_id,assigned_state_name,assigned_lga_name,assigned_ward_name,assigned_polling_unit_name,assigned_code,assigned_constituency_code,assigned_constituency_name,first_name,middle_name,surname,gender,phone,email,nin,voter_identification_number,sdp_membership_id,agent_polling_unit,agent_voting_unit,polling_unit,acknowledged_at,created_at,portal_users(status,reviewed_at,review_note)";

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
    aroId: str("aro_id"),
    aroOfficerNumber:
      typeof r.aro_officer_number === "number"
        ? r.aro_officer_number
        : r.aro_officer_number != null
          ? Number(r.aro_officer_number)
          : null,
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
    assignedConstituencyCode: str("assigned_constituency_code"),
    assignedConstituencyName: str("assigned_constituency_name"),
    firstName: r.first_name as string,
    middleName: str("middle_name"),
    surname: r.surname as string,
    phone: r.phone as string,
    email: str("email"),
    gender: str("gender"),
    nin: str("nin"),
    voterIdentificationNumber: str("voter_identification_number"),
    sdpMembershipId: str("sdp_membership_id"),
    agentPollingUnit: (r.agent_polling_unit as LocationPick | null) ?? null,
    agentVotingUnit: (r.agent_voting_unit as LocationPick | null) ?? null,
    pollingUnit: (r.polling_unit as LocationPick | null) ?? null,
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
 * Agents sign in with phone + password (email is not required).
 */
export async function createAgentRegistration(args: {
  fullName: string;
  phone: string;
  passwordHash: string;
  registration: AgentRegistrationInsert;
}): Promise<{ ok: true; id: string } | { ok: false; error: "phone_taken" | "unavailable" }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "unavailable" };

  const phone = normalizePhone(args.phone) || args.phone.trim();

  const { data: userRow, error: userError } = await supabase
    .from("portal_users")
    .insert({
      role: "agent",
      full_name: args.fullName.trim(),
      phone,
      email: null,
      password_hash: args.passwordHash,
      status: "pending",
    })
    .select("id")
    .single();

  if (userError || !userRow) {
    const msg = String(userError?.message || "").toLowerCase();
    if (userError?.code === "23505" || msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "phone_taken" };
    }
    console.error("[agent registration] insert portal user failed:", userError);
    return { ok: false, error: "unavailable" };
  }

  const userId = userRow.id as string;

  const { data: regRow, error: regError } = await supabase
    .from("agent_registrations")
    .insert({ ...args.registration, user_id: userId, phone })
    .select("id")
    .single();

  if (regError || !regRow) {
    await supabase.from("portal_users").delete().eq("id", userId);
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

/**
 * True when another agent already holds this post.
 * Post key is agent_level + assigned_code (INEC or constituency / NATIONAL).
 */
export async function agentPostTaken(args: {
  agentLevel: AgentLevel;
  assignedCode: string;
  /** When approving, ignore this user so they don't block themselves. */
  excludeUserId?: string;
  /** If true, only conflict with already-approved holders (default for apply/approve). */
  approvedOnly?: boolean;
}): Promise<boolean> {
  const code = args.assignedCode.trim();
  if (!code) return false;
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("agent_registrations")
    .select("id,user_id,portal_users!inner(status)")
    .eq("agent_level", args.agentLevel)
    .eq("assigned_code", code)
    .in("portal_users.status", args.approvedOnly ? ["approved"] : ["pending", "approved"])
    .limit(5);
  if (error) {
    console.error("[agent registration] post check failed:", error);
    return false;
  }
  const rows = (data ?? []) as { id: string; user_id: string }[];
  if (args.excludeUserId) {
    return rows.some((r) => r.user_id !== args.excludeUserId);
  }
  return rows.length > 0;
}

const AUTO_REJECT_NOTE =
  "This post was filled by another approved applicant. Your application was automatically closed.";

/**
 * After one applicant is approved for a post, reject every other pending applicant for the same seat.
 */
export async function rejectPendingApplicantsForPost(args: {
  agentLevel: AgentLevel;
  assignedCode: string;
  approvedUserId: string;
}): Promise<number> {
  const code = args.assignedCode.trim();
  if (!code) return 0;
  const supabase = createAdminClient();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("agent_registrations")
    .select("user_id,portal_users!inner(status)")
    .eq("agent_level", args.agentLevel)
    .eq("assigned_code", code)
    .eq("portal_users.status", "pending");
  if (error) {
    console.error("[agent registration] list pending for post failed:", error);
    return 0;
  }

  const userIds = ((data ?? []) as { user_id: string }[])
    .map((r) => r.user_id)
    .filter((id) => id && id !== args.approvedUserId);
  if (userIds.length === 0) return 0;

  const { error: updError } = await supabase
    .from("portal_users")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      review_note: AUTO_REJECT_NOTE,
    })
    .in("id", userIds)
    .eq("role", "agent")
    .eq("status", "pending");
  if (updError) {
    console.error("[agent registration] auto-reject pending failed:", updError);
    return 0;
  }
  return userIds.length;
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
