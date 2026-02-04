import { z } from "zod";

// Nigerian voter registration number: exactly 20 alphanumeric characters (stored without spaces)
const voterIdRegex = /^[A-Z0-9]{20}$/i;

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

  // Step 2: Contact & Age
  phone: z.string().min(10, "Valid phone required").max(15).regex(/^[0-9+\-\s()]+$/, "Invalid phone format"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  dateOfBirth: z.string().min(1, "Date of birth is required"),

  // Step 3: Political Geography
  joinDate: z.string().optional(),
  state: z.string().min(1, "State is required"),
  lga: z.string().min(1, "LGA is required"),
  ward: z.string().min(1, "Ward is required"),

  // Step 4: Verification — 20 characters, ATM-style display (XXXX XXXX XXXX XXXX XXXX)
  voterRegistrationNumber: z
    .string()
    .length(20, "Voter ID must be exactly 20 characters")
    .regex(voterIdRegex, "Invalid format (20 letters and numbers only)"),

  // Portrait (optional for preview; file handled separately)
  portraitDataUrl: z.string().optional(),

  // Consent — AEC-style membership agreement
  agreedToConstitution: z.boolean().refine((v) => v === true, { message: "You must agree to the party constitution to enroll." }),
});

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

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
  return voterIdRegex.test(raw) && raw.length === 20;
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
