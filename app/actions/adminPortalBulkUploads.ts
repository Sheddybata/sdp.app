"use server";

import { isAuthenticated } from "@/app/actions/auth";
import {
  getPortalBulkUploadById,
  listPortalBulkUploads,
  type PortalBulkUploadRow,
} from "@/lib/db/portal-bulk-uploads";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "portal-bulk-uploads";

export async function adminListPortalBulkUploads(): Promise<
  PortalBulkUploadRow[] | { error: string }
> {
  if (!(await isAuthenticated())) {
    return { error: "Unauthorized." };
  }
  return listPortalBulkUploads(200);
}

export type SignedDownloadResult =
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string };

export async function adminGetPortalBulkUploadDownloadUrl(
  id: string
): Promise<SignedDownloadResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Unauthorized." };
  }

  const row = await getPortalBulkUploadById(id);
  if (!row) {
    return { ok: false, error: "Upload not found." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, error: "Storage unavailable." };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 600);

  if (error || !data?.signedUrl) {
    console.error("[adminPortalBulkUploads] signed URL failed:", error);
    return { ok: false, error: "Could not create download link." };
  }

  return { ok: true, url: data.signedUrl, filename: row.original_filename };
}
