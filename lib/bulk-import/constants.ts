/** 1×1 transparent PNG — satisfies “portrait required” for CSV/Excel bulk rows; replace later in admin if needed. */
export const BULK_IMPORT_PLACEHOLDER_PORTRAIT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const BULK_IMPORT_MAX_ROWS = 300;

/**
 * Column titles for downloaded CSV/Excel. Text in " (…)" is a hint for users only;
 * the importer strips from the first " (" to get the field name (e.g. date_of_birth).
 */
export const BULK_TEMPLATE_HEADERS = [
  "title (e.g. Mr Mrs Dr)",
  "surname",
  "first_name",
  "other_names",
  "nin (11 digits)",
  "phone",
  "email (optional)",
  "date_of_birth (YYYY-MM-DD e.g. 1999-05-22)",
  "address",
  "voter_registration_number (19-20 chars, no spaces)",
  "state (same spelling as enrollment form)",
  "lga",
  "ward",
  "polling_unit",
] as const;

function csvEscapeCell(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

/** First CSV row for templates (quoted where needed). */
export const BULK_TEMPLATE_CSV_HEADER_LINE =
  BULK_TEMPLATE_HEADERS.map(csvEscapeCell).join(",") + "\n";
