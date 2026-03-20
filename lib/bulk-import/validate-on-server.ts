import { enrollmentSchema } from "@/lib/enrollment-schema";
import { getWardCodes } from "@/lib/location-codes";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { rawRowToEnrollmentDraft } from "./normalize-row";

export type BulkRowValidation =
  | { ok: true; rowIndex: number; data: EnrollmentFormData }
  | { ok: false; rowIndex: number; errors: string[] };

export function validateBulkImportRow(
  raw: Record<string, string>,
  rowIndex: number
): BulkRowValidation {
  const draft = rawRowToEnrollmentDraft(raw);
  const geoErrors: string[] = [];
  let codes: ReturnType<typeof getWardCodes> = null;
  try {
    codes = getWardCodes(draft.state, draft.lga, draft.ward);
  } catch (err) {
    console.error("[bulk-import] getWardCodes failed:", err);
    geoErrors.push(
      err instanceof Error && err.message.includes("location-codes")
        ? "Server location file is missing or unreadable (public/location-codes.csv)."
        : "Could not verify state / LGA / ward on the server."
    );
  }
  if (!codes && geoErrors.length === 0) {
    geoErrors.push(
      "Unknown state / LGA / ward (check spelling, or use the same values as the enrollment form / location data)."
    );
  }

  const parsed = enrollmentSchema.safeParse(draft);
  if (!parsed.success) {
    const zodErrors = parsed.error.issues.map((e) =>
      e.path.length ? `${e.path.join(".")}: ${e.message}` : e.message
    );
    return { ok: false, rowIndex, errors: [...zodErrors, ...geoErrors] };
  }

  if (geoErrors.length) {
    return { ok: false, rowIndex, errors: geoErrors };
  }

  return { ok: true, rowIndex, data: parsed.data };
}

export function validateAllBulkRows(
  rows: Record<string, string>[]
): BulkRowValidation[] {
  return rows.map((raw, i) => validateBulkImportRow(raw, i + 2));
  // +2: 1-based data row index in spreadsheet (row 1 = header)
}
