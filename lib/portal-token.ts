/**
 * Signed portal session token (Node.js server actions only).
 * Format: base64(email:role:userId:timestamp:signatureHex)
 * Signature = HMAC-SHA256(SESSION_SECRET, `${email}:${role}:${userId}:${timestamp}`)
 *
 * Middleware uses the same algorithm with Web Crypto (see middleware.ts).
 */
import crypto from "crypto";
import { PORTAL_SESSION_COOKIE_NAME } from "@/lib/portal-session-constants";

export type PortalRole = "agent" | "cluster";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getPortalCookieName(): string {
  return PORTAL_SESSION_COOKIE_NAME;
}

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || "change-this-secret-in-production";
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

export function createPortalSessionToken(
  email: string,
  role: PortalRole,
  userId: string
): string {
  const normalized = email.trim().toLowerCase();
  const timestamp = Date.now();
  const payload = `${normalized}:${role}:${userId}:${timestamp}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

export type ParsedPortalSession =
  | { ok: true; email: string; role: PortalRole; userId: string; timestamp: number }
  | { ok: false };

/** Parse and verify HMAC + expiry. Does not check user exists in DB (caller may do). */
export function verifyPortalSessionToken(token: string | undefined): ParsedPortalSession {
  if (!token) return { ok: false };
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 5) return { ok: false };

    const signature = parts[parts.length - 1]!;
    const tsRaw = parts[parts.length - 2]!;
    const userId = parts[parts.length - 3]!;
    const roleRaw = parts[parts.length - 4]!;
    const email = parts.slice(0, -4).join(":").trim().toLowerCase();

    if (roleRaw !== "agent" && roleRaw !== "cluster") return { ok: false };
    if (!UUID_RE.test(userId)) return { ok: false };

    const timestamp = Number(tsRaw);
    if (!Number.isFinite(timestamp)) return { ok: false };

    const age = Date.now() - timestamp;
    if (age < 0 || age > MAX_AGE_MS) return { ok: false };

    const payload = `${email}:${roleRaw}:${userId}:${timestamp}`;
    const expected = signPayload(payload);
    const sigA = Buffer.from(signature, "hex");
    const sigB = Buffer.from(expected, "hex");
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return { ok: false };
    }

    return { ok: true, email, role: roleRaw as PortalRole, userId, timestamp };
  } catch {
    return { ok: false };
  }
}

export function maxAgeSeconds(): number {
  return Math.floor(MAX_AGE_MS / 1000);
}
