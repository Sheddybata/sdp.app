import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_LIST_MAX_TOTAL_ROWS, POSTGREST_PAGE_SIZE } from "@/lib/db/admin-list-limits";
import type { DbDiasporaSupporter, DbDiasporaSupporterInsert } from "./types";

export type DiasporaSupporterRecord = {
  id: string;
  surname: string;
  firstName: string;
  email: string;
  phoneE164: string;
  phoneCountryIso2: string;
  residenceCountryIso2: string;
  residenceCity: string;
  residenceAddress: string;
  nigeriaStateId: string;
  nigeriaLgaId: string;
  nigeriaStateName: string;
  nigeriaLgaName: string;
  vin: string | null;
  portraitDataUrl: string | null;
  idDocumentDataUrl: string | null;
  createdAt: string;
  registeredVia: string;
};

/** Admin list only — excludes large base64 image columns. */
const DIASPORA_LIST_COLUMNS =
  "id,surname,first_name,email,phone_e164,phone_country_iso2,residence_country_iso2,residence_city,residence_address,nigeria_state_id,nigeria_lga_id,nigeria_state_name,nigeria_lga_name,vin,created_at,registered_via";

function rowToRecord(row: DbDiasporaSupporter): DiasporaSupporterRecord {
  return {
    id: row.id,
    surname: row.surname,
    firstName: row.first_name,
    email: row.email,
    phoneE164: row.phone_e164,
    phoneCountryIso2: row.phone_country_iso2,
    residenceCountryIso2: row.residence_country_iso2,
    residenceCity: row.residence_city,
    residenceAddress: row.residence_address,
    nigeriaStateId: row.nigeria_state_id,
    nigeriaLgaId: row.nigeria_lga_id,
    nigeriaStateName: row.nigeria_state_name,
    nigeriaLgaName: row.nigeria_lga_name,
    vin: row.vin,
    portraitDataUrl: row.portrait_data_url,
    idDocumentDataUrl: row.id_document_data_url,
    createdAt: row.created_at,
    registeredVia: row.registered_via,
  };
}

export async function insertDiasporaSupporter(
  row: DbDiasporaSupporterInsert
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Registration is temporarily unavailable. Please try again later or contact support.",
    };
  }

  const { data, error } = await supabase
    .from("diaspora_supporters")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[DIASPORA] insert error:", error);
    return {
      ok: false,
      error:
        "We could not save your registration. Please check your connection and try again.",
    };
  }

  if (!data?.id) {
    return { ok: false, error: "Registration failed. Please try again." };
  }

  return { ok: true, id: data.id };
}

function buildDiasporaListQuery(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  opts?: { search?: string }
) {
  let query = supabase
    .from("diaspora_supporters")
    .select(DIASPORA_LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (opts?.search) {
    const q = opts.search.trim().replace(/[%_]/g, "");
    if (q) {
      query = query.or(
        `surname.ilike.%${q}%,first_name.ilike.%${q}%,email.ilike.%${q}%,phone_e164.ilike.%${q}%,residence_city.ilike.%${q}%,residence_address.ilike.%${q}%`
      );
    }
  }
  return query;
}

export async function getDiasporaSupporters(opts?: {
  search?: string;
}): Promise<DiasporaSupporterRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) {
    return [];
  }

  const acc: DiasporaSupporterRecord[] = [];
  for (let from = 0; ; from += POSTGREST_PAGE_SIZE) {
    if (acc.length >= ADMIN_LIST_MAX_TOTAL_ROWS) {
      console.warn(
        `[ADMIN] Diaspora list capped at ${ADMIN_LIST_MAX_TOTAL_ROWS} rows (ADMIN_LIST_MAX_TOTAL_ROWS).`
      );
      break;
    }
    const to = from + POSTGREST_PAGE_SIZE - 1;
    const { data, error } = await buildDiasporaListQuery(supabase, opts).range(from, to);
    if (error) {
      console.error("[ADMIN] diaspora list error:", error);
      return [];
    }
    const rows = data ?? [];
    for (const r of rows) {
      if (acc.length >= ADMIN_LIST_MAX_TOTAL_ROWS) break;
      acc.push(
        rowToRecord({
          ...(r as object),
          portrait_data_url: null,
          id_document_data_url: null,
        } as DbDiasporaSupporter)
      );
    }
    if (acc.length >= ADMIN_LIST_MAX_TOTAL_ROWS) break;
    if (rows.length === 0 || rows.length < POSTGREST_PAGE_SIZE) break;
  }
  return acc;
}

/** Single row for admin detail sheet (includes portrait and ID document URLs). */
export async function getDiasporaSupporterById(
  id: string
): Promise<DiasporaSupporterRecord | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("diaspora_supporters")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[ADMIN] diaspora get by id error:", error);
    return null;
  }
  if (!data) return null;
  return rowToRecord(data as DbDiasporaSupporter);
}
