import { z } from "zod";

const dataUrlSchema = z
  .string()
  .max(2_500_000, "Image is too large. Please use a smaller photo.")
  .optional()
  .nullable();

export const diasporaEnrollPayloadSchema = z.object({
  surname: z.string().trim().min(1, "Surname is required").max(120),
  firstName: z.string().trim().min(1, "First name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  phoneCountryIso2: z.string().length(2, "Select a country code"),
  phoneNational: z
    .string()
    .trim()
    .min(5, "Enter your phone number")
    .max(20, "Phone number is too long"),
  residenceCountryIso2: z.string().length(2, "Select your country of residence"),
  residenceCity: z.string().trim().min(1, "City is required").max(120),
  residenceAddress: z.string().trim().min(5, "Enter a full address").max(500),
  nigeriaStateId: z.string().trim().min(1, "Select state of origin"),
  nigeriaLgaId: z.string().trim().min(1, "Select LGA of origin"),
  nigeriaStateName: z.string().trim().min(1, "Select state of origin"),
  nigeriaLgaName: z.string().trim().min(1, "Select LGA of origin"),
  vin: z
    .string()
    .optional()
    .transform((s) => {
      if (s == null || !String(s).trim()) return undefined;
      return String(s).replace(/\s/g, "").slice(0, 40);
    }),
  portraitDataUrl: dataUrlSchema,
  idDocumentDataUrl: dataUrlSchema,
});

export type DiasporaEnrollPayload = z.infer<typeof diasporaEnrollPayloadSchema>;
