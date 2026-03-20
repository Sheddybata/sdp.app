import { createAdminClient } from "@/lib/supabase/admin";

export interface PortalBulkUploadRow {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  portal_role: string;
  uploaded_by_email: string;
  data_row_count: number | null;
  validation_summary: Record<string, unknown>;
  created_at: string;
}

export async function insertPortalBulkUploadRecord(args: {
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  portalRole: "agent" | "cluster";
  uploadedByEmail: string;
  uploadedByPortalUserId: string | null;
  dataRowCount: number | null;
  validationSummary: Record<string, unknown>;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase
    .from("portal_bulk_uploads")
    .insert({
      storage_path: args.storagePath,
      original_filename: args.originalFilename,
      mime_type: args.mimeType,
      byte_size: args.byteSize,
      portal_role: args.portalRole,
      uploaded_by_email: args.uploadedByEmail,
      uploaded_by_portal_user_id: args.uploadedByPortalUserId,
      data_row_count: args.dataRowCount,
      validation_summary: args.validationSummary,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[portal_bulk_uploads] insert failed:", error);
    return { ok: false };
  }
  return { ok: true, id: data.id as string };
}

export async function listPortalBulkUploads(
  limit = 100
): Promise<PortalBulkUploadRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("portal_bulk_uploads")
    .select(
      "id, storage_path, original_filename, mime_type, byte_size, portal_role, uploaded_by_email, data_row_count, validation_summary, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as PortalBulkUploadRow[];
}

export async function getPortalBulkUploadById(
  id: string
): Promise<PortalBulkUploadRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("portal_bulk_uploads")
    .select(
      "id, storage_path, original_filename, mime_type, byte_size, portal_role, uploaded_by_email, data_row_count, validation_summary, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PortalBulkUploadRow;
}
