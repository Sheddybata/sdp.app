"use server";

import { isAuthenticated } from "@/app/actions/auth";
import {
  getAgentPhotosByIds,
  getAgentRegistrationById,
  setPortalUserStatus,
  type PortalUserStatus,
} from "@/lib/db/agent-registrations";
import { AGENT_PHOTO_BATCH_SIZE } from "@/lib/agent-registration-schema";

export async function fetchAgentRegistrationDetail(id: string) {
  if (!(await isAuthenticated())) return null;
  if (!id || typeof id !== "string") return null;
  return getAgentRegistrationById(id);
}

export async function fetchAgentCardPhotos(ids: string[]): Promise<Record<string, string | null>> {
  if (!(await isAuthenticated())) return {};
  if (!Array.isArray(ids)) return {};
  const clean = ids.filter((id) => typeof id === "string" && id.length > 0).slice(0, AGENT_PHOTO_BATCH_SIZE);
  return getAgentPhotosByIds(clean);
}

export async function adminSetAgentRegistrationStatus(args: {
  userId: string;
  status: Exclude<PortalUserStatus, "pending">;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAuthenticated())) return { ok: false, error: "Unauthorized." };
  if (args.status !== "approved" && args.status !== "rejected") {
    return { ok: false, error: "Invalid status." };
  }
  const ok = await setPortalUserStatus(args);
  return ok ? { ok: true } : { ok: false, error: "Could not update this agent. Please try again." };
}
