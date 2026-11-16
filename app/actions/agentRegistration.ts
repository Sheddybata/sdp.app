"use server";

import bcrypt from "bcryptjs";
import {
  agentRegistrationSchema,
  isConstituencyAgentLevel,
  LOCATION_CODE_MISSING_MESSAGE,
  normalizeMembershipId,
  usesAdminLocationPicker,
  zodFieldErrors,
  type AgentLevel,
  type LocationPick,
} from "@/lib/agent-registration-schema";
import {
  agentExistsForMember,
  agentPostTaken,
  createAgentRegistration,
} from "@/lib/db/agent-registrations";
import { getMemberByMembershipId } from "@/lib/db/members";
import { lookupLocationCode } from "@/app/actions/locationCodes";
import { verifyConstituencyAssignment } from "@/app/actions/constituencies";
import { nationalAgentPost } from "@/lib/constituency-data";
import { normalizePhone } from "@/lib/otp/termii";
import type { MemberRecord } from "@/lib/mock-members";

export type AgentRegistrationResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type AgentMembershipCheck =
  | { ok: true; membershipId: string; firstName: string; middleName: string; surname: string }
  | { ok: false; error: string };

const MEMBER_NOT_FOUND =
  "We couldn't find this SDP membership ID. Check the number on your membership card, or register as a member first.";
const MEMBER_ALREADY_AGENT =
  "This member is already registered as an agent. Sign in instead, or contact the SDP secretariat.";
const POST_TAKEN =
  "This post already has an approved agent. Choose a different assignment, or contact the SDP secretariat.";
const PHONE_TAKEN =
  "An agent account with this phone number already exists. Sign in instead, or use a different number.";

async function resolveMember(
  raw: string
): Promise<{ ok: true; member: MemberRecord } | { ok: false; error: string }> {
  const normalized = normalizeMembershipId(raw ?? "");
  if (normalized.length < 6 || normalized.length > 96) return { ok: false, error: MEMBER_NOT_FOUND };
  const member = await getMemberByMembershipId(normalized);
  if (!member) return { ok: false, error: MEMBER_NOT_FOUND };
  if (await agentExistsForMember(member.id)) return { ok: false, error: MEMBER_ALREADY_AGENT };
  return { ok: true, member };
}

function memberDisplayId(member: MemberRecord, fallback: string): string {
  return member.locationMembershipId || member.membershipId || normalizeMembershipId(fallback);
}

/** Look up an SDP membership ID for the member apply path. */
export async function checkAgentMembership(membershipId: string): Promise<AgentMembershipCheck> {
  if (typeof membershipId !== "string") return { ok: false, error: MEMBER_NOT_FOUND };
  const found = await resolveMember(membershipId);
  if (!found.ok) return found;
  const m = found.member;
  return {
    ok: true,
    membershipId: memberDisplayId(m, membershipId),
    firstName: m.firstName,
    middleName: m.otherNames ?? "",
    surname: m.surname,
  };
}

function puIndex(loc: LocationPick): number | undefined {
  const m = /-(\d+)$/.exec(loc.pollingUnitId);
  return m ? Number(m[1]) : undefined;
}

/** Recompute the code on the server so stored codes never depend on client input. */
async function withServerCode(loc: LocationPick, level: AgentLevel): Promise<LocationPick> {
  const code = await lookupLocationCode({
    level,
    stateId: loc.stateId,
    lgaId: loc.lgaId || undefined,
    wardId: loc.wardId || undefined,
    pollingUnitName: loc.pollingUnitName || undefined,
    pollingUnitIndex: puIndex(loc),
  });
  return { ...loc, code: code ?? "" };
}

export async function submitAgentRegistration(raw: unknown): Promise<AgentRegistrationResult> {
  const parsed = agentRegistrationSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = zodFieldErrors(parsed.error);
    return {
      ok: false,
      error: Object.values(fieldErrors)[0] ?? "Please check the form and try again.",
      fieldErrors,
    };
  }
  const v = parsed.data;
  const isMember = v.membershipPath === "member";

  let memberId: string | null = null;
  let firstName = v.firstName.trim();
  let middleName = (v.middleName ?? "").trim();
  let surname = v.surname.trim();
  let sdpMembershipId: string | null = null;
  let gender: string | null = v.gender ?? null;

  if (isMember) {
    const found = await resolveMember(v.sdpMembershipId ?? "");
    if (!found.ok) {
      return { ok: false, error: found.error, fieldErrors: { sdpMembershipId: found.error } };
    }
    const member = found.member;
    memberId = member.id;
    firstName = member.firstName.trim();
    middleName = (member.otherNames ?? "").trim();
    surname = member.surname.trim();
    sdpMembershipId = memberDisplayId(member, v.sdpMembershipId ?? "");
    gender = member.gender ?? null;
  }

  const level = v.agentLevel;
  let assignment = v.assignment;
  let constituencyCode: string | null = null;
  let constituencyName: string | null = null;

  if (level === "national") {
    const nat = nationalAgentPost();
    assignment = {
      ...assignment,
      stateId: "national",
      stateName: "Nationwide",
      code: nat.code,
      lgaId: "",
      lgaName: "",
      wardId: "",
      wardName: "",
      pollingUnitId: "",
      pollingUnitName: "",
    };
    constituencyCode = nat.code;
    constituencyName = nat.name;
  } else if (isConstituencyAgentLevel(level)) {
    const verified = await verifyConstituencyAssignment({
      level,
      stateId: assignment.stateId,
      code: assignment.code,
    });
    if (!verified.ok) {
      return { ok: false, error: verified.error, fieldErrors: { assignment: verified.error } };
    }
    assignment = {
      ...assignment,
      code: verified.seat.code,
      pollingUnitName: verified.seat.name,
      stateId: verified.seat.stateId,
      stateName: verified.seat.stateName,
      lgaId: "",
      lgaName: "",
      wardId: "",
      wardName: "",
      pollingUnitId: verified.seat.code,
    };
    constituencyCode = verified.seat.code;
    constituencyName = verified.seat.name;
  } else if (usesAdminLocationPicker(level)) {
    assignment = await withServerCode(v.assignment, level);
  }

  const [agentPollingUnit, agentVotingUnit, pollingUnit] = await Promise.all([
    withServerCode(v.agentPollingUnit, "polling_unit"),
    withServerCode(v.agentVotingUnit, "polling_unit"),
    withServerCode(v.pollingUnit, "polling_unit"),
  ]);

  const missingCode = (
    [
      ["assignment", assignment],
      ["agentPollingUnit", agentPollingUnit],
      ["agentVotingUnit", agentVotingUnit],
      ["pollingUnit", pollingUnit],
    ] as const
  ).find(([, loc]) => !loc.code);
  if (missingCode) {
    return {
      ok: false,
      error: LOCATION_CODE_MISSING_MESSAGE,
      fieldErrors: { [missingCode[0]]: LOCATION_CODE_MISSING_MESSAGE },
    };
  }

  // Only an approved holder locks the seat — multiple people may apply and await review.
  if (await agentPostTaken({ agentLevel: level, assignedCode: assignment.code, approvedOnly: true })) {
    return { ok: false, error: POST_TAKEN, fieldErrors: { assignment: POST_TAKEN } };
  }

  const passwordHash = await bcrypt.hash(v.password, await bcrypt.genSalt(10));
  const fullName = [firstName, middleName, surname].filter(Boolean).join(" ");
  const phone = normalizePhone(v.phone) || v.phone.trim();

  const isAdminLadder = usesAdminLocationPicker(level);
  const result = await createAgentRegistration({
    fullName,
    phone,
    passwordHash,
    registration: {
      member_id: memberId,
      agent_level: level,
      assigned_state_id: assignment.stateId,
      assigned_state_name: assignment.stateName,
      assigned_lga_id: isAdminLadder && level !== "state" ? assignment.lgaId || null : null,
      assigned_lga_name: isAdminLadder && level !== "state" ? assignment.lgaName || null : null,
      assigned_ward_id: level === "ward" || level === "polling_unit" ? assignment.wardId || null : null,
      assigned_ward_name:
        level === "ward" || level === "polling_unit" ? assignment.wardName || null : null,
      assigned_polling_unit_name: level === "polling_unit" ? assignment.pollingUnitName || null : null,
      assigned_code: assignment.code || null,
      assigned_constituency_code: constituencyCode,
      assigned_constituency_name: constituencyName,
      first_name: firstName,
      middle_name: middleName || null,
      surname,
      gender,
      phone,
      email: null,
      nin: v.nin,
      voter_identification_number: v.voterIdentificationNumber,
      sdp_membership_id: sdpMembershipId,
      agent_polling_unit: agentPollingUnit,
      agent_voting_unit: agentVotingUnit,
      polling_unit: pollingUnit,
      photo_data_url: v.photoDataUrl,
      membership_id_card_data_url:
        isMember && v.membershipIdCardDataUrl ? v.membershipIdCardDataUrl : null,
      pvc_data_url: v.pvcDataUrl,
      acknowledged_at: new Date().toISOString(),
    },
  });

  if (!result.ok) {
    if (result.error === "phone_taken") {
      return {
        ok: false,
        error: PHONE_TAKEN,
        fieldErrors: { phone: "This phone number is already registered." },
      };
    }
    if (result.error === "member_taken") {
      return { ok: false, error: MEMBER_ALREADY_AGENT, fieldErrors: { sdpMembershipId: MEMBER_ALREADY_AGENT } };
    }
    if (result.error === "nin_taken") {
      return {
        ok: false,
        error: "An agent with this NIN has already registered. Contact the SDP secretariat if this is a mistake.",
        fieldErrors: { nin: "This NIN is already registered." },
      };
    }
    return { ok: false, error: "Registration is temporarily unavailable. Please try again later." };
  }

  return { ok: true };
}
