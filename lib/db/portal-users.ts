import { createAdminClient } from "@/lib/supabase/admin";
import type { PortalRole } from "@/lib/portal-token";

export interface PortalUserRow {
  id: string;
  role: PortalRole;
  full_name: string;
  phone: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export async function findPortalUserByEmailRole(
  email: string,
  role: PortalRole
): Promise<PortalUserRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("portal_users")
    .select("id, role, full_name, phone, email, password_hash, created_at")
    .eq("role", role)
    .eq("email", normalized)
    .maybeSingle();
  if (error || !data) return null;
  return data as PortalUserRow;
}

export async function findPortalUserById(
  id: string,
  role: PortalRole,
  email: string
): Promise<PortalUserRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("portal_users")
    .select("id, role, full_name, phone, email, password_hash, created_at")
    .eq("id", id)
    .eq("role", role)
    .eq("email", normalized)
    .maybeSingle();
  if (error || !data) return null;
  return data as PortalUserRow;
}

export interface ValidInviteRow {
  id: string;
  role: PortalRole;
}

/** Lookup unused, non-expired invite by hash. */
export async function findValidInvite(
  tokenHash: string,
  role: PortalRole
): Promise<ValidInviteRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("portal_invite_tokens")
    .select("id, role, expires_at")
    .eq("token_hash", tokenHash)
    .eq("role", role)
    .is("used_at", null)
    .maybeSingle();
  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at as string) <= new Date()) {
    return null;
  }
  return { id: data.id as string, role: data.role as PortalRole };
}

/**
 * Create user and mark invite used. Rolls back user row if invite update races.
 */
export async function createPortalUserWithInvite(args: {
  inviteId: string;
  role: PortalRole;
  fullName: string;
  phone: string;
  email: string;
  passwordHash: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: "email_taken" | "invite_invalid" | "unavailable" }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "unavailable" };

  const normalizedEmail = args.email.trim().toLowerCase();

  const { data: userRow, error: insertError } = await supabase
    .from("portal_users")
    .insert({
      role: args.role,
      full_name: args.fullName.trim(),
      phone: args.phone.trim(),
      email: normalizedEmail,
      password_hash: args.passwordHash,
    })
    .select("id")
    .single();

  if (insertError) {
    const msg = String(insertError.message || "").toLowerCase();
    const code = insertError.code;
    if (code === "23505" || msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "email_taken" };
    }
    console.error("[portal signup] insert user failed:", insertError);
    return { ok: false, error: "unavailable" };
  }

  const userId = userRow.id as string;

  const { data: updated, error: updateError } = await supabase
    .from("portal_invite_tokens")
    .update({
      used_at: new Date().toISOString(),
      used_by_user_id: userId,
    })
    .eq("id", args.inviteId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await supabase.from("portal_users").delete().eq("id", userId);
    return { ok: false, error: "invite_invalid" };
  }

  return { ok: true, userId };
}

export interface PortalInviteListRow {
  id: string;
  role: PortalRole;
  note: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
}

export async function listPortalInvites(): Promise<PortalInviteListRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("portal_invite_tokens")
    .select("id, role, note, expires_at, used_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data as PortalInviteListRow[];
}

export async function insertPortalInvite(args: {
  role: PortalRole;
  tokenHash: string;
  note?: string | null;
  expiresAt?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase
    .from("portal_invite_tokens")
    .insert({
      role: args.role,
      token_hash: args.tokenHash,
      note: args.note?.trim() || null,
      expires_at: args.expiresAt || null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[portal invite] insert failed:", error);
    return { ok: false };
  }
  return { ok: true, id: data.id as string };
}
