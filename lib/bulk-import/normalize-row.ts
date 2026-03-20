import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { normalizeVoterIdInput } from "@/lib/enrollment-schema";
import { BULK_IMPORT_PLACEHOLDER_PORTRAIT } from "./constants";

const TITLE_VALUES = new Set([
  "Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Alh", "Chief",
  "Barr", "Pst", "Amb", "Maj", "Capt", "Lt", "Col", "Brig", "Gen",
  "Engr", "Elder", "Rev", "Ven", "Sir", "Dame", "Arc", "Pharm",
  "Hon", "Mallam", "Oba", "Emir", "Prince", "Prophet",
]);

/** Strip user-facing hint after " (" — template headers look like `date_of_birth (YYYY-MM-DD e.g. 1999-05-22)`. */
export function headerBaseName(h: string): string {
  const t = String(h ?? "").trim();
  const idx = t.indexOf(" (");
  return idx >= 0 ? t.slice(0, idx).trim() : t;
}

/** Normalize spreadsheet header cell to canonical snake_case key. */
export function normalizeHeaderKey(h: string): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Map alternate headers → canonical. */
const HEADER_ALIASES: Record<string, string> = {
  voter_id: "voter_registration_number",
  vin: "voter_registration_number",
  voter_registration_no: "voter_registration_number",
  firstname: "first_name",
  lastname: "surname",
  last_name: "surname",
  othername: "other_names",
  dob: "date_of_birth",
  dateofbirth: "date_of_birth",
  pu: "polling_unit",
  polling_unit_name: "polling_unit",
};

export function canonicalHeaderKey(h: string): string {
  const n = normalizeHeaderKey(headerBaseName(h));
  return HEADER_ALIASES[n] ?? n;
}

/** First row = headers; rest = data → array of plain records. */
export function sheetToRecords(matrix: string[][]): Record<string, string>[] {
  if (matrix.length < 2) return [];
  const headerRow = matrix[0]!.map((c) => canonicalHeaderKey(String(c)));
  const out: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r]!;
    const rec: Record<string, string> = {};
    let any = false;
    for (let c = 0; c < headerRow.length; c++) {
      const key = headerRow[c];
      if (!key) continue;
      const val = row[c] != null ? String(row[c]).trim() : "";
      if (val) any = true;
      rec[key] = val;
    }
    if (any) out.push(rec);
  }
  return out;
}

/** Treat blank / dash / N/A cells as empty (optional email). */
function normalizeOptionalText(s: string | undefined): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  if (/^[-–—]$/.test(t)) return "";
  if (/^(n\/?a|nil|none|null|\.{2,})$/i.test(t)) return "";
  return t;
}

function pickTitle(raw: string | undefined): EnrollmentFormData["title"] {
  const t = (raw || "Mr").trim();
  if (TITLE_VALUES.has(t)) return t as EnrollmentFormData["title"];
  return "Mr";
}

/**
 * Postgres expects ISO dates (YYYY-MM-DD). Spreadsheets often use DD/MM/YYYY (e.g. 22/05/1999).
 * - If already YYYY-MM-DD, return as-is.
 * - If DD/MM/YYYY or DD-MM-YYYY (or . separator), convert. When ambiguous (both ≤12), assume DD/MM (Nigeria).
 */
export function normalizeBulkDateToIso(s: string): string {
  const t = s.trim();
  if (!t) return t;
  // "1999-05-22 00:00:00" or ISO with time
  const dateOnly = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1]!;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (!m) return t;

  const a = parseInt(m[1]!, 10);
  const b = parseInt(m[2]!, 10);
  const y = parseInt(m[3]!, 10);

  let day: number;
  let month: number;
  if (a > 12) {
    day = a;
    month = b;
  } else if (b > 12) {
    month = a;
    day = b;
  } else {
    day = a;
    month = b;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || y < 1900 || y > 2100) {
    return t;
  }

  const dt = new Date(Date.UTC(y, month - 1, day));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return t;
  }

  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Build enrollment payload from one CSV/Excel row (before Zod / geography checks). */
export function rawRowToEnrollmentDraft(raw: Record<string, string>): EnrollmentFormData {
  const joinRaw = raw.join_date?.trim();
  const join = joinRaw
    ? normalizeBulkDateToIso(joinRaw)
    : new Date().toISOString().slice(0, 10);

  return {
    title: pickTitle(raw.title),
    surname: (raw.surname || "").trim(),
    firstName: (raw.first_name || "").trim(),
    otherNames: (raw.other_names || "").trim(),
    nin: (raw.nin || "").replace(/\D/g, "").slice(0, 11),
    phone: (raw.phone || "").trim(),
    phoneVerified: false,
    email: normalizeOptionalText(raw.email),
    dateOfBirth: normalizeBulkDateToIso((raw.date_of_birth || "").trim()),
    address: (raw.address || "").trim(),
    joinDate: join,
    state: (raw.state || "").trim(),
    lga: (raw.lga || "").trim(),
    ward: (raw.ward || "").trim(),
    pollingUnit: (raw.polling_unit || "").trim(),
    voterRegistrationNumber: normalizeVoterIdInput(raw.voter_registration_number || ""),
    portraitDataUrl: BULK_IMPORT_PLACEHOLDER_PORTRAIT,
    agreedToConstitution: true,
  };
}
