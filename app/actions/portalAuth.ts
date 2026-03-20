"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  createPortalSessionToken,
  getPortalCookieName,
  maxAgeSeconds,
  verifyPortalSessionToken,
  type PortalRole,
} from "@/lib/portal-token";
import {
  findPortalUserByEmailRole,
  findPortalUserById,
  findValidInvite,
  createPortalUserWithInvite,
} from "@/lib/db/portal-users";
import { hashInviteCode, normalizeInviteCode } from "@/lib/portal-invite";

export type PortalLoginResult =
  | { success: true }
  | { success: false; error: string };

export type PortalSignupResult =
  | { success: true }
  | { success: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  return null;
}

export async function portalLogin(
  role: PortalRole,
  email: string,
  password: string
): Promise<PortalLoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return { success: false, error: "Invalid email or password." };
  }

  const user = await findPortalUserByEmailRole(normalizedEmail, role);
  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return { success: false, error: "Invalid email or password." };
  }

  const token = createPortalSessionToken(user.email, role, user.id);
  const cookieStore = await cookies();
  cookieStore.set(getPortalCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds(),
  });

  return { success: true };
}

export async function portalSignup(args: {
  role: PortalRole;
  inviteCode: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<PortalSignupResult> {
  const fullName = args.fullName?.trim() || "";
  const phone = args.phone?.trim() || "";
  const email = args.email?.trim().toLowerCase() || "";

  if (fullName.length < 2) {
    return { success: false, error: "Please enter your full name." };
  }
  if (phone.replace(/\D/g, "").length < 10) {
    return { success: false, error: "Please enter a valid phone number." };
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const pwdErr = validatePassword(args.password);
  if (pwdErr) return { success: false, error: pwdErr };
  if (args.password !== args.confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  const normalizedCode = normalizeInviteCode(args.inviteCode || "");
  if (normalizedCode.length < 8) {
    return { success: false, error: "Please enter the invitation code from the national secretariat." };
  }

  const tokenHash = hashInviteCode(normalizedCode);
  const invite = await findValidInvite(tokenHash, args.role);
  if (!invite) {
    return {
      success: false,
      error: "That invitation code is invalid, already used, expired, or not for this portal.",
    };
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(args.password, salt);

  const created = await createPortalUserWithInvite({
    inviteId: invite.id,
    role: args.role,
    fullName,
    phone,
    email,
    passwordHash,
  });

  if (!created.ok) {
    if (created.error === "email_taken") {
      return {
        success: false,
        error: "An account with this email already exists for this portal. Sign in instead.",
      };
    }
    if (created.error === "invite_invalid") {
      return {
        success: false,
        error: "This invitation could not be confirmed. Please try again or request a new code.",
      };
    }
    return {
      success: false,
      error: "Registration is temporarily unavailable. Please try again later.",
    };
  }

  const token = createPortalSessionToken(email, args.role, created.userId);
  const cookieStore = await cookies();
  cookieStore.set(getPortalCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds(),
  });

  return { success: true };
}

export async function portalLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getPortalCookieName());
}

export type PortalSession =
  | { ok: true; email: string; role: PortalRole; userId: string }
  | { ok: false };

/** Validated portal session: signed cookie + user row still exists. */
export async function getPortalSession(): Promise<PortalSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getPortalCookieName())?.value;
  const parsed = verifyPortalSessionToken(token);
  if (!parsed.ok) return { ok: false };

  const user = await findPortalUserById(parsed.userId, parsed.role, parsed.email);
  if (!user) return { ok: false };

  return { ok: true, email: user.email, role: parsed.role, userId: user.id };
}
