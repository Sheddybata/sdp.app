"use server";

import bcrypt from "bcryptjs";
import {
  agentRegistrationSchema,
  zodFieldErrors,
  type AgentLevel,
  type LocationPick,
} from "@/lib/agent-registration-schema";
import { createAgentRegistration } from "@/lib/db/agent-registrations";
import { lookupLocationCode } from "@/app/actions/locationCodes";

export type AgentRegistrationResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

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

  const [assignment, agentPollingUnit, agentVotingUnit, pollingUnit] = await Promise.all([
    withServerCode(v.assignment, v.agentLevel),
    withServerCode(v.agentPollingUnit, "polling_unit"),
    withServerCode(v.agentVotingUnit, "polling_unit"),
    withServerCode(v.pollingUnit, "polling_unit"),
  ]);

  const level = v.agentLevel;
  const passwordHash = await bcrypt.hash(v.password, await bcrypt.genSalt(10));
  const fullName = [v.firstName, v.middleName, v.surname].filter(Boolean).join(" ");

  const result = await createAgentRegistration({
    fullName,
    phone: v.phone,
    email: v.email,
    passwordHash,
    registration: {
      agent_level: level,
      assigned_state_id: assignment.stateId,
      assigned_state_name: assignment.stateName,
      assigned_lga_id: level === "state" ? null : assignment.lgaId || null,
      assigned_lga_name: level === "state" ? null : assignment.lgaName || null,
      assigned_ward_id: level === "ward" || level === "polling_unit" ? assignment.wardId || null : null,
      assigned_ward_name:
        level === "ward" || level === "polling_unit" ? assignment.wardName || null : null,
      assigned_polling_unit_name: level === "polling_unit" ? assignment.pollingUnitName || null : null,
      assigned_code: assignment.code || null,
      first_name: v.firstName,
      middle_name: v.middleName || null,
      surname: v.surname,
      date_of_birth: v.dateOfBirth,
      phone: v.phone,
      gender: v.gender,
      email: v.email,
      voter_identification_number: v.voterIdentificationNumber,
      marital_status: v.maritalStatus,
      religion: v.religion,
      sdp_membership_id: v.sdpMembershipId,
      agent_polling_unit: agentPollingUnit,
      agent_voting_unit: agentVotingUnit,
      polling_unit: pollingUnit,
      photo_data_url: v.photoDataUrl,
      membership_id_card_data_url: v.membershipIdCardDataUrl,
      pvc_data_url: v.pvcDataUrl,
      acknowledged_at: new Date().toISOString(),
    },
  });

  if (!result.ok) {
    if (result.error === "email_taken") {
      return {
        ok: false,
        error: "An agent account with this email already exists. Sign in instead, or use a different email.",
        fieldErrors: { email: "This email is already registered." },
      };
    }
    return { ok: false, error: "Registration is temporarily unavailable. Please try again later." };
  }

  return { ok: true };
}
