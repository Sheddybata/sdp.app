import { getAgentRegistrationByUserId, type AgentRegistrationRecord } from "@/lib/db/agent-registrations";
import { listPollingUnitsInWard } from "@/lib/location-codes";
import type { Election, ReportTarget } from "@/lib/elections/shared";

export interface AgentElectionContext {
  registration: AgentRegistrationRecord;
  displayName: string;
  ownTarget: ReportTarget;
  /** Polling units a ward agent may back up; empty for other levels. */
  backupTargets: ReportTarget[];
}

function ownTargetFor(r: AgentRegistrationRecord): ReportTarget | null {
  if (!r.assignedCode) return null;
  const base = {
    level: r.agentLevel,
    locationCode: r.assignedCode,
    stateId: r.assignedStateId,
    stateName: r.assignedStateName,
    lgaId: r.assignedLgaId,
    lgaName: r.assignedLgaName,
    wardId: r.assignedWardId,
    wardName: r.assignedWardName,
    pollingUnitName: r.assignedPollingUnitName,
    isBackup: false,
  };
  switch (r.agentLevel) {
    case "polling_unit":
      return { ...base, label: r.assignedPollingUnitName ?? r.assignedCode };
    case "ward":
      return { ...base, pollingUnitName: null, label: `${r.assignedWardName} ward, ${r.assignedLgaName}` };
    case "lga":
      return { ...base, wardId: null, wardName: null, pollingUnitName: null, label: `${r.assignedLgaName} LGA` };
    case "state":
      return {
        ...base,
        lgaId: null,
        lgaName: null,
        wardId: null,
        wardName: null,
        pollingUnitName: null,
        label: `${r.assignedStateName} State`,
      };
  }
}

export async function getAgentElectionContext(
  userId: string
): Promise<{ ok: true; ctx: AgentElectionContext } | { ok: false; error: string }> {
  const registration = await getAgentRegistrationByUserId(userId);
  if (!registration) {
    return {
      ok: false,
      error:
        "Election reporting is for agents registered through the agent application. Contact the SDP secretariat to complete your agent registration.",
    };
  }
  if (registration.status !== "approved") {
    return { ok: false, error: "Your agent registration has not been approved yet." };
  }
  const ownTarget = ownTargetFor(registration);
  if (!ownTarget) {
    return {
      ok: false,
      error: "Your assignment has no location code. Contact the SDP secretariat to correct your registration.",
    };
  }

  let backupTargets: ReportTarget[] = [];
  if (registration.agentLevel === "ward" && registration.assignedLgaId && registration.assignedWardId) {
    backupTargets = listPollingUnitsInWard(
      registration.assignedStateId,
      registration.assignedLgaId,
      registration.assignedWardId
    ).map((pu) => ({
      level: "polling_unit",
      locationCode: pu.code,
      label: pu.name,
      stateId: registration.assignedStateId,
      stateName: registration.assignedStateName,
      lgaId: registration.assignedLgaId,
      lgaName: registration.assignedLgaName,
      wardId: registration.assignedWardId,
      wardName: registration.assignedWardName,
      pollingUnitName: pu.name,
      isBackup: true,
    }));
  }

  const displayName = [registration.firstName, registration.middleName, registration.surname]
    .filter(Boolean)
    .join(" ");
  return { ok: true, ctx: { registration, displayName, ownTarget, backupTargets } };
}

export function findAgentTarget(
  ctx: AgentElectionContext,
  level: string,
  locationCode: string
): ReportTarget | null {
  if (ctx.ownTarget.level === level && ctx.ownTarget.locationCode === locationCode) return ctx.ownTarget;
  return ctx.backupTargets.find((t) => t.level === level && t.locationCode === locationCode) ?? null;
}

export function electionCoversState(election: Election, stateId: string): boolean {
  if (!election.stateIds || election.stateIds.length === 0) return true;
  const id = stateId.toLowerCase();
  return election.stateIds.some((s) => s.toLowerCase() === id);
}
