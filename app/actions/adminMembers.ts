"use server";

import { getMemberByIdForAdmin } from "@/lib/db/members";
import { getDiasporaSupporterById } from "@/lib/db/diaspora-supporters";

export async function fetchAdminMemberDetail(id: string) {
  if (!id || typeof id !== "string") return null;
  return getMemberByIdForAdmin(id);
}

export async function fetchAdminDiasporaDetail(id: string) {
  if (!id || typeof id !== "string") return null;
  return getDiasporaSupporterById(id);
}
