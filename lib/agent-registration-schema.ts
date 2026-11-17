import { z } from "zod";
import { isValidEnrollmentNigerianPhone } from "@/lib/phone-nigeria";

export const AGENT_LEVELS = [
  "national",
  "state",
  "senatorial",
  "house_of_reps",
  "state_assembly",
  "lga",
  "ward",
  "polling_unit",
] as const;
export type AgentLevel = (typeof AGENT_LEVELS)[number];

export const AGENT_LEVEL_LABELS: Record<AgentLevel, string> = {
  national: "National Agent",
  state: "State Agent",
  senatorial: "Senatorial District Agent",
  house_of_reps: "House of Reps Agent",
  state_assembly: "State Assembly Constituency Agent",
  lga: "LG Agent",
  ward: "Ward Agent",
  polling_unit: "Polling Agent",
};

/** Registration UI groups (party collation layers). */
export const AGENT_LEVEL_GROUPS: { id: string; title: string; levels: AgentLevel[] }[] = [
  {
    id: "national_collation",
    title: "National Collation Agents",
    levels: ["national", "state", "senatorial", "house_of_reps"],
  },
  {
    id: "state_collation",
    title: "State Collation Agents",
    levels: ["state_assembly", "lga"],
  },
  {
    id: "baseline_collation",
    title: "Baseline Collation Agents",
    levels: ["ward"],
  },
  {
    id: "polling_unit_agents",
    title: "Polling Unit Agents",
    levels: ["polling_unit"],
  },
];

/** Photos per admin fetch; keeps responses under Vercel's 4.5 MB limit (photos are up to ~900 KB). */
export const AGENT_PHOTO_BATCH_SIZE = 4;

/** Label for the "name" field shown once a level is ticked (matches the party's form). */
export const AGENT_LEVEL_NAME_LABELS: Record<AgentLevel, string> = {
  national: "Nationwide post",
  state: "State name",
  senatorial: "Senatorial district",
  house_of_reps: "Federal constituency",
  state_assembly: "State assembly constituency",
  lga: "LGA name",
  ward: "Ward name",
  polling_unit: "Polling unit name",
};

/** Levels that pick an INEC constituency (SD / FC / SC) instead of LGA→ward→PU. */
export const CONSTITUENCY_AGENT_LEVELS = ["senatorial", "house_of_reps", "state_assembly"] as const;
export type ConstituencyAgentLevel = (typeof CONSTITUENCY_AGENT_LEVELS)[number];

export function isConstituencyAgentLevel(level: AgentLevel): level is ConstituencyAgentLevel {
  return (CONSTITUENCY_AGENT_LEVELS as readonly string[]).includes(level);
}

/** Levels that use the classic State→LGA→Ward→PU location picker. */
export function usesAdminLocationPicker(level: AgentLevel): boolean {
  return level === "state" || level === "lga" || level === "ward" || level === "polling_unit";
}

/** Same normalisation the member lookup uses (spaces removed, upper case). */
export function normalizeMembershipId(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase().trim();
}

export const LOCATION_CODE_MISSING_MESSAGE =
  "The code for this location has not loaded. Wait a moment and try again — if it still does not appear, contact the SDP secretariat.";

/** Placeholder until the party supplies the official declaration text. */
export const AGENT_DECLARATION_TEXT =
  "I confirm that the information I have provided is true and complete, and that I will carry out my duties as an agent in line with the party constitution and the Electoral Act.";

export const AGENT_GENDERS = ["Male", "Female"] as const;
export type AgentGender = (typeof AGENT_GENDERS)[number];

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
  if (level === "national") return loc.stateName || "Nationwide";
  if (level === "state") return loc.stateName;
  if (isConstituencyAgentLevel(level)) return loc.pollingUnitName || loc.code || "";
  if (level === "lga") return loc.lgaName;
  if (level === "ward") return loc.wardName;
  return loc.pollingUnitName;
}

export function isLocationComplete(loc: LocationPick, level: AgentLevel): boolean {
  if (level === "national") return loc.code.trim().toUpperCase() === "NATIONAL";
  if (!loc.stateId) return false;
  if (level === "state") return true;
  if (isConstituencyAgentLevel(level)) {
    // Constituency name stored in pollingUnitName; code is the SD/FC/SC code.
    return !!loc.code.trim() && !!(loc.pollingUnitName || loc.code).trim();
  }
  if (!loc.lgaId) return false;
  if (level === "lga") return true;
  if (!loc.wardId) return false;
  if (level === "ward") return true;
  return !!loc.pollingUnitName.trim();
}

/** Readable one-line summary, e.g. "Polling unit name — Ward, LGA, State (37/01/01/001)". */
export function formatLocationPick(loc: LocationPick, level: AgentLevel = "polling_unit"): string {
  if (level === "national") return loc.code ? `Nationwide (${loc.code})` : "Nationwide";
  if (isConstituencyAgentLevel(level)) {
    const name = loc.pollingUnitName || loc.code;
    const parts = [name, loc.stateName].filter(Boolean);
    const text = parts.join(", ");
    if (!text) return "—";
    return loc.code && name !== loc.code ? `${text} (${loc.code})` : text;
  }
  const parts: string[] = [];
  if (level === "polling_unit" && loc.pollingUnitName) parts.push(loc.pollingUnitName);
  if ((level === "polling_unit" || level === "ward") && loc.wardName) parts.push(loc.wardName);
  if (level !== "state" && loc.lgaName) parts.push(loc.lgaName);
  if (loc.stateName) parts.push(loc.stateName);
  const text = parts.join(", ");
  if (!text) return "—";
  return loc.code ? `${text} (${loc.code})` : text;
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
    } else if (!val.assignment.code.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["assignment"], message: LOCATION_CODE_MISSING_MESSAGE });
    }
  });

const agentStep2Object = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(80),
  middleName: z.string().trim().max(80).optional().default(""),
  surname: z.string().trim().min(2, "Surname is required").max(80),
  gender: z.enum(AGENT_GENDERS, {
    required_error: "Select your gender.",
    invalid_type_error: "Select your gender.",
  }),
  phone: z.string().trim().refine(isValidEnrollmentNigerianPhone, {
    message: "Use a Nigerian mobile number, e.g. 08012345678 or +2348012345678.",
  }),
  photoDataUrl: imageDataUrl("Upload your photo."),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: "Tick the declaration to continue." }),
  }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
  confirmPassword: z.string(),
});

export const agentStep2Schema = agentStep2Object.superRefine((val, ctx) => {
  if (val.password !== val.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    });
  }
});

/** Field names owned by step 2 (for sending users back after server errors). */
export const AGENT_STEP2_FIELD_KEYS = Object.keys(agentStep2Object.shape);

export const agentRegistrationSchema = z
  .object({
    firstName: z.string().trim().min(2).max(80),
    middleName: z.string().trim().max(80).optional().default(""),
    surname: z.string().trim().min(2).max(80),
    gender: z.enum(AGENT_GENDERS),
    phone: z.string().trim().refine(isValidEnrollmentNigerianPhone, {
      message: "Use a Nigerian mobile number, e.g. 08012345678 or +2348012345678.",
    }),
    agentLevel: z.enum(AGENT_LEVELS),
    assignment: locationPickSchema,
    photoDataUrl: imageDataUrl("Upload your photo."),
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
    } else if (!val.assignment.code.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["assignment"], message: LOCATION_CODE_MISSING_MESSAGE });
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
  gender: AgentGender | "";
  phone: string;
  photoDataUrl: string;
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
  gender: "",
  phone: "",
  photoDataUrl: "",
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
