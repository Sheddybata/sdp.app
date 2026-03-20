"use server";

import { getPortalSession } from "@/app/actions/portalAuth";
import { BULK_IMPORT_MAX_ROWS } from "@/lib/bulk-import/constants";
import { sheetToRecords } from "@/lib/bulk-import/normalize-row";
import { parseCsvToMatrix, parseExcelToMatrix } from "@/lib/bulk-import/parse-spreadsheet";
import { validateAllBulkRows } from "@/lib/bulk-import/validate-on-server";
import { insertPortalBulkUploadRecord } from "@/lib/db/portal-bulk-uploads";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "portal-bulk-uploads";
const MAX_BYTES = 25 * 1024 * 1024;

function safeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim() || "upload";
  return base.slice(0, 180);
}

export type SubmitBulkForReviewResult =
  | {
      ok: true;
      message: string;
      uploadId: string;
      summary: {
        dataRowCount: number;
        rowsWithIssues: number;
        parsedOk: boolean;
      };
    }
  | { ok: false; error: string };

/**
 * Agent/cluster: upload CSV/XLSX to storage + register row for admin download.
 * File is always stored; validation is advisory (warnings in validation_summary).
 */
export async function submitPortalBulkForReview(
  formData: FormData
): Promise<SubmitBulkForReviewResult> {
  const session = await getPortalSession();
  if (!session.ok) {
    return { ok: false, error: "Please sign in to the portal again." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a non-empty file." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is too large (max 25 MB)." };
  }

  const name = file.name || "upload";
  const lower = name.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    return { ok: false, error: "Use a .csv, .xlsx, or .xls file." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, error: "Upload is temporarily unavailable." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const mime =
    file.type ||
    (lower.endsWith(".csv")
      ? "text/csv"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  let validationSummary: Record<string, unknown> = {};
  let dataRowCount: number | null = null;
  let rowsWithIssues = 0;

  try {
    let matrix: string[][];
    if (lower.endsWith(".csv")) {
      matrix = parseCsvToMatrix(buf.toString("utf8"));
    } else {
      matrix = parseExcelToMatrix(arrayBuffer);
    }

    const recs = sheetToRecords(matrix);
    dataRowCount = recs.length;

    if (recs.length > BULK_IMPORT_MAX_ROWS) {
      validationSummary = {
        parsedOk: true,
        parseNote: `More than ${BULK_IMPORT_MAX_ROWS} rows; only first ${BULK_IMPORT_MAX_ROWS} were analyzed for the report.`,
      };
      const sliced = recs.slice(0, BULK_IMPORT_MAX_ROWS);
      const validations = validateAllBulkRows(sliced);
      const rowWarnings = validations.map((v) => ({
        row: v.rowIndex,
        status: v.ok ? ("ok" as const) : ("issues" as const),
        messages: v.ok ? [] : v.errors,
      }));
      rowsWithIssues = rowWarnings.filter((r) => r.messages.length).length;
      validationSummary = {
        ...validationSummary,
        dataRowCountTotal: recs.length,
        dataRowCountAnalyzed: sliced.length,
        rowsWithIssues,
        rowWarnings: rowWarnings.slice(0, 200),
        truncatedReport: rowWarnings.length > 200,
      };
    } else {
      const validations = validateAllBulkRows(recs);
      const rowWarnings = validations.map((v) => ({
        row: v.rowIndex,
        status: v.ok ? ("ok" as const) : ("issues" as const),
        messages: v.ok ? [] : v.errors,
      }));
      rowsWithIssues = rowWarnings.filter((r) => r.messages.length).length;
      validationSummary = {
        parsedOk: true,
        dataRowCount: recs.length,
        rowsWithIssues,
        rowsOk: rowWarnings.filter((r) => r.status === "ok").length,
        rowWarnings: rowWarnings.slice(0, 200),
        truncatedReport: rowWarnings.length > 200,
        note: "Issues listed are hints for HQ; the original file is unchanged and was stored as submitted.",
      };
    }
  } catch (e) {
    validationSummary = {
      parsedOk: false,
      parseError: e instanceof Error ? e.message : "Could not parse file for a row report.",
      note: "File was still stored for manual review.",
    };
  }

  const safeName = safeFilename(name);
  const storagePath = `${session.role}/${session.userId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: mime,
    upsert: false,
  });

  if (upErr) {
    console.error("[portalBulkSubmit] storage upload failed:", upErr);
    return {
      ok: false,
      error:
        "Could not store the file. Ensure Supabase Storage bucket `portal-bulk-uploads` exists (run migration 011).",
    };
  }

  const inserted = await insertPortalBulkUploadRecord({
    storagePath,
    originalFilename: name,
    mimeType: mime,
    byteSize: buf.length,
    portalRole: session.role,
    uploadedByEmail: session.email,
    uploadedByPortalUserId: session.userId,
    dataRowCount,
    validationSummary,
  });

  if (!inserted.ok) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: "Could not save upload record. Please try again." };
  }

  const finalRowCount = dataRowCount ?? 0;

  return {
    ok: true,
    uploadId: inserted.id,
    message:
      "Your file was submitted to the national office. HQ can download it from Admin → Bulk uploads. Row checks are hints only — your file was not rejected.",
    summary: {
      dataRowCount: finalRowCount,
      rowsWithIssues,
      parsedOk: validationSummary.parsedOk !== false,
    },
  };
}
