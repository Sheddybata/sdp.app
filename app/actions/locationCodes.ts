"use server";

import {
  getLgaCode,
  getPollingUnitCode,
  getStateCode,
  getWardCodes,
} from "@/lib/location-codes";
import type { AgentLevel } from "@/lib/agent-registration-schema";

export type LocationCodeInput = {
  level: AgentLevel;
  stateId: string;
  lgaId?: string;
  wardId?: string;
  pollingUnitName?: string;
  /** Position of the polling unit in the INEC ward list (id suffix). */
  pollingUnitIndex?: number;
};

/** INEC-style code for the selected location, e.g. `37/01/01/001` for a polling unit. */
export async function lookupLocationCode(input: LocationCodeInput): Promise<string | null> {
  try {
    const stateCode = getStateCode(input.stateId);
    if (!stateCode) return null;
    if (input.level === "state") return stateCode;

    if (!input.lgaId) return null;
    const lgaCode = getLgaCode(input.stateId, input.lgaId);
    if (!lgaCode) return null;
    if (input.level === "lga") return `${stateCode}/${lgaCode}`;

    if (!input.wardId) return null;
    const ward = getWardCodes(input.stateId, input.lgaId, input.wardId);
    if (!ward) return null;
    if (input.level === "ward") return `${stateCode}/${lgaCode}/${ward.wardCode}`;

    if (!input.pollingUnitName) return null;
    const puCode = getPollingUnitCode(
      input.stateId,
      input.lgaId,
      input.wardId,
      input.pollingUnitName,
      input.pollingUnitIndex
    );
    if (!puCode) return null;
    return `${stateCode}/${lgaCode}/${ward.wardCode}/${puCode}`;
  } catch (err) {
    console.error("[location codes] lookup failed:", err);
    return null;
  }
}
