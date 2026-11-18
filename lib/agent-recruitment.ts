import crypto from "crypto";
import { hashInviteCode, normalizeInviteCode } from "@/lib/portal-invite";
import { findInecState } from "@/lib/inec-states";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSeg(len: number): string {
  return Array.from({ length: len }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join("");
}

/** Short multi-use code, e.g. A3-7K2M (easy to type on a phone). */
export function generateShortAroCode(officerNumber: number): string {
  return `A${officerNumber}-${randomSeg(4)}`;
}

/** Independent state code, e.g. BO-7K2M for Borno. */
export function generateShortStateCode(stateId: string): string {
  const prefix = findInecState(stateId)?.prefix ?? "ST";
  return `${prefix}-${randomSeg(4)}`;
}

export function normalizeAroCode(input: string): string {
  return normalizeInviteCode(input);
}

export function hashAroCode(normalizedCode: string): string {
  return hashInviteCode(normalizedCode);
}

export const normalizeStateRecruitmentCode = normalizeAroCode;
export const hashStateRecruitmentCode = hashAroCode;
