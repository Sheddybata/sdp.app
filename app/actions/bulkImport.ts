"use server";

import { getPortalSession } from "@/app/actions/portalAuth";
import { BULK_IMPORT_MAX_ROWS } from "@/lib/bulk-import/constants";
import { validateAllBulkRows } from "@/lib/bulk-import/validate-on-server";
import { insertMember } from "@/lib/db/members";

export type BulkPreviewResult =
  | {
      ok: true;
      rowCount: number;
      validCount: number;
      invalidCount: number;
      issues: Array<{ rowIndex: number; errors: string[] }>;
    }
  | { ok: false; error: string };

/** Validate rows for signed-in agent/cluster user (no DB writes). */
export async function previewBulkMemberImport(
  rows: Record<string, string>[]
): Promise<BulkPreviewResult> {
  try {
    const session = await getPortalSession();
    if (!session.ok) {
      return { ok: false, error: "Please sign in to the portal again." };
    }
    if (!rows?.length) {
      return { ok: false, error: "No rows to validate." };
    }
    if (rows.length > BULK_IMPORT_MAX_ROWS) {
      return {
        ok: false,
        error: `Too many rows (${rows.length}). Maximum is ${BULK_IMPORT_MAX_ROWS} per file.`,
      };
    }

    const results = validateAllBulkRows(rows);
    const invalid = results.filter((r) => !r.ok);
    const validCount = results.length - invalid.length;

    return {
      ok: true,
      rowCount: rows.length,
      validCount,
      invalidCount: invalid.length,
      issues: invalid.map((r) => ({
        rowIndex: r.rowIndex,
        errors: r.errors,
      })),
    };
  } catch (e) {
    console.error("[bulkImport] previewBulkMemberImport:", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Validation failed unexpectedly. Refresh the page and try again.",
    };
  }
}

export type BulkCommitResult =
  | {
      ok: true;
      saved: number;
      failed: number;
      total: number;
      details: Array<{ rowIndex: number; ok: boolean; error?: string }>;
    }
  | { ok: false; error: string };

/** Insert validated rows; re-validates server-side before each insert. */
export async function commitBulkMemberImport(
  rows: Record<string, string>[]
): Promise<BulkCommitResult> {
  try {
    const session = await getPortalSession();
    if (!session.ok) {
      return { ok: false, error: "Please sign in to the portal again." };
    }
    if (!rows?.length) {
      return { ok: false, error: "No rows to import." };
    }
    if (rows.length > BULK_IMPORT_MAX_ROWS) {
      return {
        ok: false,
        error: `Too many rows. Maximum is ${BULK_IMPORT_MAX_ROWS} per file.`,
      };
    }

    const registration = {
      registered_via: session.role,
      registered_by: session.email,
    } as const;

    const validations = validateAllBulkRows(rows);
    const details: Array<{ rowIndex: number; ok: boolean; error?: string }> = [];
    let saved = 0;
    let failed = 0;

    for (const v of validations) {
      if (!v.ok) {
        failed++;
        details.push({
          rowIndex: v.rowIndex,
          ok: false,
          error: v.errors.join("; "),
        });
        continue;
      }
      const result = await insertMember(v.data, registration);
      if (result.ok) {
        saved++;
        details.push({ rowIndex: v.rowIndex, ok: true });
      } else {
        failed++;
        details.push({
          rowIndex: v.rowIndex,
          ok: false,
          error: result.error,
        });
      }
    }

    return {
      ok: true,
      saved,
      failed,
      total: rows.length,
      details,
    };
  } catch (e) {
    console.error("[bulkImport] commitBulkMemberImport:", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Import failed unexpectedly. Refresh the page and try again.",
    };
  }
}
