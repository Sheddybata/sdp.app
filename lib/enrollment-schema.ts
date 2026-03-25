import { z } from "zod";
import { isDobWithinEnrollmentRules, isValidJoinMonthYearIso } from "@/lib/enrollment-dates";
import { isValidEnrollmentNigerianPhone } from "@/lib/phone-nigeria";
import { PWD_CATEGORY_VALUES, type PwdCategory } from "@/lib/pwd-enrollment";

export type { PwdCategory } from "@/lib/pwd-enrollment";
export { PWD_CATEGORY_VALUES } from "@/lib/pwd-enrollment";

// Nigerian voter registration number: 19–20 alphanumeric characters (stored without spaces)
const voterIdRegex = /^[A-Z0-9]{19,20}$/i;
const ninRegex = /^[0-9]{11}$/;

export const enrollmentSchema = z.object({
  // Step 1: Identity — Nigerian titles: Barr., Pst., Amb., military, Hon., Prince, Prophet, etc.
  title: z.enum([
    "Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Alh", "Chief",
    "Barr", "Pst", "Amb", "Maj", "Capt", "Lt", "Col", "Brig", "Gen",
    "Engr", "Elder", "Rev", "Ven", "Sir", "Dame", "Arc", "Pharm",
    "Hon", "Mallam", "Oba", "Emir", "Prince", "Prophet",
  ]),
  surname: z.string().min(2, "Surname is required (min 2 characters)").max(80),
  firstName: z.string().min(2, "First name is required").max(80),
  otherNames: z.string().max(160).optional(),
  nin: z
    .string()
    .regex(ninRegex, "NIN must be exactly 11 digits"),

  // Step 2: Contact & Age
  phone: z
    .string()
    .min(10, "Valid phone required")
    .max(22)
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone format")
    .refine(isValidEnrollmentNigerianPhone, {
      message:
        "Use a Nigerian mobile number: +234… or 234…, or local 070, 080, 081, 090, or 091 followed by 8 more digits.",
    }),
  phoneVerified: z.boolean().optional().default(false),
  // Empty string = no email (bulk CSV / optional field). Invalid non-empty must fail.
  email: z
    .string()
    .refine(
      (val) => {
        const s = val.trim();
        return s === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
      },
      { message: "Valid email required" }
    ),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine(isDobWithinEnrollmentRules, {
      message: "Date of birth must be between 1925 and 2008 and you must be at least 18 (and not over 110 years old).",
    }),
  address: z.string().min(5, "Address is required").max(200),

  // Step 3: Political Geography
  joinDate: z
    .string()
    .min(1, "Membership month and year are required")
    .refine(isValidJoinMonthYearIso, {
      message: "Choose membership join month from January 2010 through the current month.",
    }),
  state: z.string().min(1, "State is required"),
  lga: z.string().min(1, "LGA is required"),
  ward: z.string().min(1, "Ward is required"),
  pollingUnit: z.string().min(2, "Polling unit is required").max(120),

  // Step 4: Verification — 19–20 characters, ATM-style display (XXXX XXXX XXXX XXXX XXXX)
  voterRegistrationNumber: z
    .string()
    .min(19, "Voter ID must be 19 or 20 characters")
    .max(20, "Voter ID must be 19 or 20 characters")
    .regex(voterIdRegex, "Invalid format (letters and numbers only)"),

  // Portrait (required)
  portraitDataUrl: z.string().min(1, "Portrait is required"),

  // Consent — AEC-style membership agreement
  agreedToConstitution: z.boolean().refine((v) => v === true, { message: "You must agree to the party constitution to enroll." }),

  // Step 4 — PWD (mandatory yes/no; category required if yes)
  pwdIdentifies: z.boolean({
    required_error: "Please answer whether you identify as a person with a disability.",
    invalid_type_error: "Please select Yes or No.",
  }),
  pwdCategory: z
    .enum(PWD_CATEGORY_VALUES as unknown as [PwdCategory, ...PwdCategory[]])
    .optional(),
  pwdCategoryOther: z.string().max(200).optional(),

  // Optional enriched fields (not user-input)
  locationMembershipId: z.string().optional(),
  wardSerial: z.string().optional(),
  membershipId: z.string().optional(),
})
  .superRefine((val, ctx) => {
    if (val.pwdIdentifies === true) {
      if (!val.pwdCategory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a disability category.",
          path: ["pwdCategory"],
        });
      }
      if (val.pwdCategory === "other") {
        const detail = val.pwdCategoryOther?.trim();
        if (!detail) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please specify when you choose Other.",
            path: ["pwdCategoryOther"],
          });
        }
      }
    }
  });

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

type NameParts = {
  surname: string;
  firstName: string;
  otherNames?: string | null;
};

/**
 * Nigerian display order: first name, other names (middle), then surname.
 * Title-cases each whitespace-separated token.
 */
export function formatEnrollmentDisplayName(data: NameParts): string {
  const raw = [data.firstName, data.otherNames, data.surname]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!raw) return "—";
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Title (Mr, Dr, …) + {@link formatEnrollmentDisplayName} for ID card and previews. */
export function formatEnrollmentNameWithTitle(data: EnrollmentFormData): string {
  const name = formatEnrollmentDisplayName(data);
  const t = data.title?.trim();
  if (!t) return name;
  return `${t} ${name}`;
}

/** Same as {@link formatEnrollmentNameWithTitle} for DB/admin rows (optional title). */
export function formatEnrollmentNameWithTitleFromParts(data: NameParts & { title?: string | null }): string {
  const name = formatEnrollmentDisplayName(data);
  const t = data.title?.trim();
  if (!t) return name;
  return `${t} ${name}`;
}

/** Strip spaces for validation/storage; display with 4-digit spacing */
export function formatVoterIdDisplay(value: string): string {
  const raw = value.replace(/\s/g, "");
  return raw.replace(/(.{4})/g, "$1 ").trim();
}

export function normalizeVoterIdInput(value: string): string {
  return value.replace(/\s/g, "").slice(0, 20);
}

export function validateVoterId(value: string): boolean {
  const raw = value.replace(/\s/g, "");
  return voterIdRegex.test(raw) && (raw.length === 19 || raw.length === 20);
}

/** Derive membership ID like SDP-SHE-249891 from surname + voter ID (for lookup/verification). */
export function getMembershipIdFromData(data: {
  surname: string;
  voterRegistrationNumber?: string;
}): string {
  const prefix = (data.surname || "")
    .replace(/\s/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const suffix = (data.voterRegistrationNumber || "").replace(/\s/g, "").slice(-6);
  return `SDP-${prefix}-${suffix || "------"}`;
}

/**
 * Same ID string shown on the digital card, enrollment preview, downloads, and admin.
 * Prefers location-based ID (e.g. 17-09-11-AA123), then stored membership_id, then derived SDP-XXX-NNNNNN.
 */
export function getMembershipIdDisplayForRecord(data: {
  locationMembershipId?: string;
  membershipId?: string;
  surname: string;
  voterRegistrationNumber?: string;
}): string {
  const loc = data.locationMembershipId?.trim();
  const mid = data.membershipId?.trim();
  if (loc) return loc;
  if (mid) return mid;
  return getMembershipIdFromData(data);
}
