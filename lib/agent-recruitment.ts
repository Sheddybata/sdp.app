import crypto from "crypto";
import { hashInviteCode, normalizeInviteCode } from "@/lib/portal-invite";

/** Short multi-use code, e.g. A3-7K2M (easy to type on a phone). */
export function generateShortAroCode(officerNumber: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join("");
  return `A${officerNumber}-${seg}`;
}

export function normalizeAroCode(input: string): string {
  return normalizeInviteCode(input);
}

export function hashAroCode(normalizedCode: string): string {
  return hashInviteCode(normalizedCode);
}
