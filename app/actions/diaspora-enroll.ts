"use server";

import { diasporaEnrollPayloadSchema } from "@/lib/diaspora-enroll-schema";
import { getDialForIso2 } from "@/lib/data/country-dial-codes";
import { insertDiasporaSupporter } from "@/lib/db/diaspora-supporters";
import type { DbDiasporaSupporterInsert } from "@/lib/db/types";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function toE164(dial: string, nationalDigits: string): string {
  const d = dial.replace(/\D/g, "");
  const n = nationalDigits.replace(/\D/g, "");
  if (!d || !n) return "";
  return `+${d}${n}`;
}

export async function submitDiasporaEnrollment(
  raw: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = diasporaEnrollPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first =
      Object.values(msg).flat()[0] ?? "Please check the form and try again.";
    return { ok: false, error: first };
  }

  const v = parsed.data;
  const dial = getDialForIso2(v.phoneCountryIso2);
  if (!dial) {
    return { ok: false, error: "Invalid phone country selection." };
  }

  const national = digitsOnly(v.phoneNational);
  if (national.length < 5) {
    return { ok: false, error: "Enter a valid phone number (digits only)." };
  }

  const phoneE164 = toE164(dial, national);
  if (phoneE164.length < 8) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const insert: DbDiasporaSupporterInsert = {
    surname: v.surname,
    first_name: v.firstName,
    email: v.email.toLowerCase(),
    phone_e164: phoneE164,
    phone_country_iso2: v.phoneCountryIso2.toUpperCase(),
    residence_country_iso2: v.residenceCountryIso2.toUpperCase(),
    residence_city: v.residenceCity,
    residence_address: v.residenceAddress,
    nigeria_state_id: v.nigeriaStateId,
    nigeria_lga_id: v.nigeriaLgaId,
    nigeria_state_name: v.nigeriaStateName,
    nigeria_lga_name: v.nigeriaLgaName,
    vin: v.vin || null,
    portrait_data_url: v.portraitDataUrl || null,
    id_document_data_url: v.idDocumentDataUrl || null,
    registered_via: "diaspora",
  };

  return insertDiasporaSupporter(insert);
}
