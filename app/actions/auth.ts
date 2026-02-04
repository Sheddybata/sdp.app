"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Read environment variables dynamically (not at module level to avoid caching issues)
function getAdminEmail() {
  const email = process.env.ADMIN_EMAIL;
  console.log('[getAdminEmail] Raw env value:', email);
  console.log('[getAdminEmail] Type:', typeof email);
  const trimmed = email?.trim() || "admin@sdp.org";
  console.log('[getAdminEmail] Returning:', trimmed);
  return trimmed;
}

function getAdminPasswordHash() {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  console.log('[getAdminPasswordHash] Raw env value exists:', !!hash);
  console.log('[getAdminPasswordHash] Length:', hash?.length || 0);
  console.log('[getAdminPasswordHash] First 20 chars:', hash?.substring(0, 20) || 'N/A');
  // Remove any escape characters that might have been added
  const cleaned = hash?.replace(/\\\$/g, '$').trim() || "";
  console.log('[getAdminPasswordHash] Cleaned length:', cleaned.length);
  console.log('[getAdminPasswordHash] Cleaned first 20 chars:', cleaned.substring(0, 20) || 'N/A');
  return cleaned;
}

// If no hash is set, we'll use a default password "admin123" hash
// In production, you should set ADMIN_PASSWORD_HASH in your .env file
const DEFAULT_PASSWORD_HASH = "$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq";

const SESSION_COOKIE_NAME = "admin_session";

function getSessionSecret() {
  return process.env.SESSION_SECRET?.trim() || "change-this-secret-in-production";
}

function signSessionPayload(payload: string): string {
  const secret = getSessionSecret();
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function createSessionToken(email: string): string {
  const timestamp = Date.now();
  const payload = `${email}:${timestamp}`;
  const signature = signSessionPayload(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [emailRaw, tsRaw, signature] = decoded.split(":");
    if (!emailRaw || !tsRaw || !signature) return false;

    const payload = `${emailRaw}:${tsRaw}`;
    const expectedSignature = signSessionPayload(payload);

    const sigA = Buffer.from(signature, "hex");
    const sigB = Buffer.from(expectedSignature, "hex");
    if (sigA.length !== sigB.length) return false;

    if (!crypto.timingSafeEqual(sigA, sigB)) return false;

    const ts = Number(tsRaw);
    if (!Number.isFinite(ts)) return false;

    return true;
  } catch {
    return false;
  }
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  // Log immediately to ensure function is called
  console.log('========================================');
  console.log('[AUTH] Login function CALLED');
  console.log('[AUTH] Email received:', email);
  console.log('[AUTH] Password received:', password ? '***' : 'EMPTY');
  console.log('========================================');
  
  try {
    // Read env vars dynamically
    const ADMIN_EMAIL = getAdminEmail();
    const ADMIN_PASSWORD_HASH = getAdminPasswordHash();
    
    console.log('[AUTH] Environment check:');
    console.log('[AUTH]   ADMIN_EMAIL from getAdminEmail():', ADMIN_EMAIL);
    console.log('[AUTH]   ADMIN_PASSWORD_HASH exists:', !!ADMIN_PASSWORD_HASH);
    console.log('[AUTH]   ADMIN_PASSWORD_HASH length:', ADMIN_PASSWORD_HASH?.length || 0);
    console.log('[AUTH]   process.env.ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
    console.log('[AUTH]   process.env.ADMIN_PASSWORD_HASH exists:', !!process.env.ADMIN_PASSWORD_HASH);
    
    // Trim and normalize email/password
    const normalizedEmail = email?.trim().toLowerCase() || '';
    const normalizedPassword = password?.trim() || '';
    const expectedEmail = ADMIN_EMAIL.trim().toLowerCase();
    
    console.log('[AUTH] Normalized values:');
    console.log('[AUTH]   normalizedEmail:', normalizedEmail);
    console.log('[AUTH]   expectedEmail:', expectedEmail);
    console.log('[AUTH]   Email match:', normalizedEmail === expectedEmail);
    
    // Validate email
    if (normalizedEmail !== expectedEmail) {
      console.log('[AUTH] ❌ EMAIL MISMATCH');
      console.log('[AUTH]   Expected:', expectedEmail);
      console.log('[AUTH]   Received:', normalizedEmail);
      return { ok: false, error: "Invalid email or password" };
    }

    // Get password hash from env or use default
    const passwordHash = ADMIN_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
    
    // If using default hash, check against default password
    if (!ADMIN_PASSWORD_HASH) {
      console.log('[AUTH] Using DEFAULT password check (no hash found)');
      if (normalizedPassword !== "admin123") {
        console.log('[AUTH] ❌ DEFAULT PASSWORD MISMATCH');
        return { ok: false, error: "Invalid email or password" };
      }
      console.log('[AUTH] ✅ Default password matched');
    } else {
      // Verify password against hash
      console.log('[AUTH] Comparing password against hash...');
      const isValid = await bcrypt.compare(normalizedPassword, passwordHash);
      console.log('[AUTH] Password comparison result:', isValid);
      if (!isValid) {
        console.log('[AUTH] ❌ PASSWORD HASH MISMATCH');
        return { ok: false, error: "Invalid email or password" };
      }
      console.log('[AUTH] ✅ Password hash matched');
    }

    // Create signed session token
    const sessionToken = createSessionToken(email);
    console.log('[AUTH] Session token created');
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    
    console.log('[AUTH] ✅ LOGIN SUCCESS');
    console.log('========================================');
    return { ok: true };
  } catch (error) {
    console.error('[AUTH] ❌ EXCEPTION:', error);
    console.error('[AUTH] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return { ok: false, error: "An error occurred during login" };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const ADMIN_EMAIL = getAdminEmail();
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!session?.value) {
      return false;
    }

    if (!verifySessionToken(session.value)) {
      return false;
    }

    const decoded = Buffer.from(session.value, "base64").toString("utf-8");
    const [email] = decoded.split(":");
    return email?.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();
  } catch {
    return false;
  }
}
