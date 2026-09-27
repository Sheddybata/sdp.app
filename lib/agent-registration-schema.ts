import { z } from "zod";
import { isDobWithinEnrollmentRules } from "@/lib/enrollment-dates";
import { isValidEnrollmentNigerianPhone } from "@/lib/phone-nigeria";
import { validateVoterId } from "@/lib/enrollment-schema";

export const AGENT_LEVELS = ["polling_unit", "ward", "lga", "state"] as const;
export type AgentLevel = (typeof AGENT_LEVELS)[number];

export const AGENT_LEVEL_LABELS: Record<AgentLevel, string> = {
  polling_unit: "Polling Agent",
  ward: "Ward Agent",
  lga: "Local Government Agent",
  state: "State Agent",
};

/** Photos per admin fetch; keeps responses under Vercel's 4.5 MB limit (photos are up to ~900 KB). */
export const AGENT_PHOTO_BATCH_SIZE = 4;

/** Label for the "name" field shown once a level is ticked (matches the party's form). */
export const AGENT_LEVEL_NAME_LABELS: Record<AgentLevel, string> = {
  polling_unit: "Polling unit name",
  ward: "Ward name",
  lga: "LGA name",
  state: "State name",
};

export const AGENT_GENDERS = ["Male", "Female"] as const;
export const AGENT_MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"] as const;
export const AGENT_RELIGIONS = ["Christianity", "Islam", "Traditional", "Other"] as const;

/** Placeholder until the party supplies the official declaration text. */
export const AGENT_DECLARATION_TEXT =
  "I confirm that the information I have provided is true and complete, that I am a registered member of the Social Democratic Party, and that I will carry out my duties as an agent in line with the party constitution and the Electoral Act.";

export const locationPickSchema = z.object({
  stateId: z.string().default(""),
  stateName: z.string().default(""),
  lgaId: z.string().default(""),
  lgaName: z.string().default(""),
  wardId: z.string().default(""),
  wardName: z.string().default(""),
  pollingUnitId: z.string().default(""),
  pollingUnitName: z.string().default(""),
  code: z.string().default(""),
});

export type LocationPick = z.infer<typeof locationPickSchema>;

export const EMPTY_LOCATION: LocationPick = {
  stateId: "",
  stateName: "",
  lgaId: "",
  lgaName: "",
  wardId: "",
  wardName: "",
  pollingUnitId: "",
  pollingUnitName: "",
  code: "",
};

/** Name of the deepest location required for `level` (empty if not chosen yet). */
export function locationNameForLevel(loc: LocationPick, level: AgentLevel): string {
  if (level === "state") return loc.stateName;
  if (level === "lga") return loc.lgaName;
  if (level === "ward") return loc.wardName;
  return loc.pollingUnitName;
}

export function isLocationComplete(loc: LocationPick, level: AgentLevel): boolean {
  if (!loc.stateId) return false;
  if (level === "state") return true;
  if (!loc.lgaId) return false;
  if (level === "lga") return true;
  if (!loc.wardId) return false;
  if (level === "ward") return true;
  return !!loc.pollingUnitName.trim();
}

/** Readable one-line summary, e.g. "Polling unit name — Ward, LGA, State (37/01/01/001)". */
export function formatLocationPick(loc: LocationPick, level: AgentLevel = "polling_unit"): string {
  const parts: string[] = [];
  if (level === "polling_unit" && loc.pollingUnitName) parts.push(loc.pollingUnitName);
  if ((level === "polling_unit" || level === "ward") && loc.wardName) parts.push(loc.wardName);
  if (level !== "state" && loc.lgaName) parts.push(loc.lgaName);
  if (loc.stateName) parts.push(loc.stateName);
  const text = parts.join(", ");
  if (!text) return "—";
  return loc.code ? `${text} (${loc.code})` : text;
}

function requireLocation(level: AgentLevel, message: string) {
  return locationPickSchema.refine((loc) => isLocationComplete(loc, level), { message });
}

const imageDataUrl = (message: string) =>
  z
    .string({ required_error: message })
    .min(1, message)
    .max(900_000, "This image is too large. Please use a smaller photo.")
    .refine((s) => s.startsWith("data:image/"), { message: "Please upload an image file." });

export const agentStep1Schema = z
  .object({
    agentLevel: z.enum(AGENT_LEVELS, {
      required_error: "Tick the type of agent you are registering as.",
      invalid_type_error: "Tick the type of agent you are registering as.",
    }),
    assignment: locationPickSchema,
  })
  .superRefine((val, ctx) => {
    if (!isLocationComplete(val.assignment, val.agentLevel)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignment"],
        message: `Select the ${AGENT_LEVEL_NAME_LABELS[val.agentLevel].toLowerCase()}.`,
      });
    }
  });

export const agentStep2Schema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(80),
  middleName: z.string().trim().max(80).optional().default(""),
  surname: z.string().trim().min(2, "Surname is required").max(80),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine(isDobWithinEnrollmentRules, {
      message: "Enter a valid date of birth (you must be at least 18).",
    }),
  phone: z.string().trim().refine(isValidEnrollmentNigerianPhone, {
    message: "Use a Nigerian mobile number, e.g. 08012345678 or +2348012345678.",
  }),
  gender: z.enum(AGENT_GENDERS, { required_error: "Select your gender." }),
  email: z.string().trim().toLowerCase().email("Enter a valid email address (you will use it to sign in)."),
  voterIdentificationNumber: z
    .string()
    .transform((s) => s.replace(/\s/g, "").toUpperCase())
    .refine(validateVoterId, { message: "Voter ID must be 19 or 20 letters and numbers." }),
  maritalStatus: z.enum(AGENT_MARITAL_STATUSES, { required_error: "Select your marital status." }),
  religion: z.enum(AGENT_RELIGIONS, { required_error: "Select your religion." }),
  agentPollingUnit: requireLocation("polling_unit", "Select the agent's polling unit."),
  agentVotingUnit: requireLocation("polling_unit", "Select the agent voting unit."),
  sdpMembershipId: z.string().trim().min(3, "Enter your SDP membership ID").max(60),
  pollingUnit: requireLocation("polling_unit", "Select the polling unit."),
});

export const agentStep3Schema = z
  .object({
    photoDataUrl: imageDataUrl("Upload your photo."),
    membershipIdCardDataUrl: imageDataUrl("Upload your membership ID card."),
    pvcDataUrl: imageDataUrl("Upload your PVC."),
    acknowledged: z.literal(true, {
      errorMap: () => ({ message: "Tick the declaration to continue." }),
    }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password is too long."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const agentRegistrationSchema = z
  .object({
    ...agentStep2Schema.shape,
    agentLevel: z.enum(AGENT_LEVELS),
    assignment: locationPickSchema,
    photoDataUrl: imageDataUrl("Upload your photo."),
    membershipIdCardDataUrl: imageDataUrl("Upload your membership ID card."),
    pvcDataUrl: imageDataUrl("Upload your PVC."),
    acknowledged: z.literal(true),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .superRefine((val, ctx) => {
    if (!isLocationComplete(val.assignment, val.agentLevel)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignment"],
        message: "Select where you will serve as an agent.",
      });
    }
    if (val.password !== val.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export type AgentRegistrationPayload = z.input<typeof agentRegistrationSchema>;

/** Form state held by the wizard across steps. */
export type AgentRegistrationDraft = {
  agentLevel: AgentLevel | null;
  assignment: LocationPick;
  firstName: string;
  middleName: string;
  surname: string;
  dateOfBirth: string;
  phone: string;
  gender: string;
  email: string;
  voterIdentificationNumber: string;
  maritalStatus: string;
  religion: string;
  agentPollingUnit: LocationPick;
  agentVotingUnit: LocationPick;
  sdpMembershipId: string;
  pollingUnit: LocationPick;
  photoDataUrl: string;
  membershipIdCardDataUrl: string;
  pvcDataUrl: string;
  acknowledged: boolean;
  password: string;
  confirmPassword: string;
};

export const EMPTY_AGENT_DRAFT: AgentRegistrationDraft = {
  agentLevel: null,
  assignment: EMPTY_LOCATION,
  firstName: "",
  middleName: "",
  surname: "",
  dateOfBirth: "",
  phone: "",
  gender: "",
  email: "",
  voterIdentificationNumber: "",
  maritalStatus: "",
  religion: "",
  agentPollingUnit: EMPTY_LOCATION,
  agentVotingUnit: EMPTY_LOCATION,
  sdpMembershipId: "",
  pollingUnit: EMPTY_LOCATION,
  photoDataUrl: "",
  membershipIdCardDataUrl: "",
  pvcDataUrl: "",
  acknowledged: false,
  password: "",
  confirmPassword: "",
};

/** Flatten zod issues to `{ fieldName: firstMessage }` (top-level path segment). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
