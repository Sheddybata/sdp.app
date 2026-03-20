import crypto from "crypto";

/** Normalize user-entered invitation code (case/spacing). */
export function normalizeInviteCode(input: string): string {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

/**
 * Stored hash for invite rows. Use PORTAL_INVITE_PEPPER in production so DB leaks
 * don't trivially allow offline guessing of short codes.
 */
export function hashInviteCode(normalizedCode: string): string {
  const pepper = (process.env.PORTAL_INVITE_PEPPER || "").trim();
  const payload = pepper ? `${pepper}:${normalizedCode}` : normalizedCode;
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/** Human-friendly single-use code for admin to copy (e.g. SDP-A1B2-C3D4). */
export function generatePlainInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join("");
  return `SDP-${seg(4)}-${seg(4)}-${seg(4)}`;
}
