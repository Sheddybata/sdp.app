"use server";

import { isAuthenticated } from "@/app/actions/auth";
import { insertPortalInvite } from "@/lib/db/portal-users";
import {
  generatePlainInviteCode,
  hashInviteCode,
  normalizeInviteCode,
} from "@/lib/portal-invite";
import type { PortalRole } from "@/lib/portal-token";

export type CreateInviteResult =
  | { ok: true; plainCode: string; id: string }
  | { ok: false; error: string };

/**
 * Admin-only: create a single-use signup code for agent or cluster portal.
 * Plain code is shown once; only a hash is stored.
 */
export async function adminCreatePortalInvite(args: {
  role: PortalRole;
  note?: string;
  /** ISO date string YYYY-MM-DD or empty for no expiry */
  expiresAtDate?: string;
}): Promise<CreateInviteResult> {
  const authed = await isAuthenticated();
  if (!authed) {
    return { ok: false, error: "Unauthorized." };
  }

  let expiresAt: string | null = null;
  if (args.expiresAtDate?.trim()) {
    const d = new Date(args.expiresAtDate.trim() + "T23:59:59.999Z");
    if (!Number.isFinite(d.getTime())) {
      return { ok: false, error: "Invalid expiry date." };
    }
    expiresAt = d.toISOString();
  }

  const plainCode = generatePlainInviteCode();
  const tokenHash = hashInviteCode(normalizeInviteCode(plainCode));

  const inserted = await insertPortalInvite({
    role: args.role,
    tokenHash,
    note: args.note,
    expiresAt,
  });

  if (!inserted.ok) {
    return { ok: false, error: "Could not create invite. Check database configuration." };
  }

  return { ok: true, plainCode, id: inserted.id };
}
