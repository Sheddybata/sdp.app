"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import {
  agentRegistrationSchema,
  isConstituencyAgentLevel,
  LOCATION_CODE_MISSING_MESSAGE,
  usesAdminLocationPicker,
  zodFieldErrors,
  type AgentLevel,
  type LocationPick,
} from "@/lib/agent-registration-schema";
import { agentPostTaken, createAgentRegistration } from "@/lib/db/agent-registrations";
import { findActiveAroByCode } from "@/lib/db/agent-recruitment";
import { findActiveStateCodeByPlain } from "@/lib/db/agent-state-recruitment";
import { lookupLocationCode } from "@/app/actions/locationCodes";
import { verifyConstituencyAssignment } from "@/app/actions/constituencies";
import { nationalAgentPost } from "@/lib/constituency-data";
import { titleCaseStateName } from "@/lib/inec-states";
import { normalizePhone } from "@/lib/otp/termii";

export type AgentRegistrationResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const POST_TAKEN =
  "This post already has an approved agent. Choose a different assignment, or contact the SDP secretariat.";
const PHONE_TAKEN =
  "An agent with this phone number has already registered. Contact the SDP secretariat if this is a mistake.";
const CODE_INVALID =
  "That recruitment code is invalid or has been revoked. Ask your Agent Registration Officer for a current code.";

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

  const aro = await findActiveAroByCode(v.recruitmentCode);
  const stateCode = aro ? null : await findActiveStateCodeByPlain(v.recruitmentCode);
  if (!aro && !stateCode) {
    return { ok: false, error: CODE_INVALID, fieldErrors: { recruitmentCode: CODE_INVALID } };
  }

  const firstName = v.firstName.trim();
  const surname = v.surname.trim();
  const gender = v.gender;

  const level = v.agentLevel;
  let assignment = v.assignment;
  let constituencyCode: string | null = null;
  let constituencyName: string | null = null;

  if (stateCode && level === "national") {
    return {
      ok: false,
      error: "State recruitment codes cannot register a National Agent.",
      fieldErrors: { agentLevel: "State recruitment codes cannot register a National Agent." },
    };
  }

  if (stateCode) {
    if (assignment.stateId !== stateCode.stateId) {
      const msg = `This code is locked to ${titleCaseStateName(stateCode.stateName)}. Choose an assignment in that state.`;
      return { ok: false, error: msg, fieldErrors: { assignment: msg } };
    }
  }

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

  if (!assignment.code.trim()) {
    return {
      ok: false,
      error: LOCATION_CODE_MISSING_MESSAGE,
      fieldErrors: { assignment: LOCATION_CODE_MISSING_MESSAGE },
    };
  }

  // Only an approved holder locks the seat — multiple people may apply and await review.
  if (await agentPostTaken({ agentLevel: level, assignedCode: assignment.code, approvedOnly: true })) {
    return { ok: false, error: POST_TAKEN, fieldErrors: { assignment: POST_TAKEN } };
  }

  // Agents do not get portal login; store an unusable random hash to satisfy portal_users.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), await bcrypt.genSalt(10));
  const fullName = [firstName, surname].filter(Boolean).join(" ");
  const phone = normalizePhone(v.phone) || v.phone.trim();

  const isAdminLadder = usesAdminLocationPicker(level);
  const result = await createAgentRegistration({
    fullName,
    phone,
    passwordHash,
    registration: {
      member_id: null,
      aro_id: aro?.id ?? null,
      aro_officer_number: aro?.officerNumber ?? null,
      state_recruitment_code_id: stateCode?.id ?? null,
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
      middle_name: null,
      surname,
      gender,
      phone,
      email: null,
      nin: null,
      voter_identification_number: null,
      sdp_membership_id: null,
      agent_polling_unit: null,
      agent_voting_unit: null,
      polling_unit: null,
      photo_data_url: v.photoDataUrl,
      membership_id_card_data_url: null,
      pvc_data_url: null,
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
    return { ok: false, error: "Registration is temporarily unavailable. Please try again later." };
  }

  return { ok: true };
}
