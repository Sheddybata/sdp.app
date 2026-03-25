/** Database row shape for members table (snake_case from Supabase) */
export interface DbMember {
  id: string;
  title: string;
  surname: string;
  first_name: string;
  other_names: string | null;
  nin: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  address: string | null;
  join_date: string | null;
  state: string;
  lga: string;
  ward: string;
  polling_unit: string | null;
  voter_registration_number: string;
  membership_id: string | null;
  location_membership_id: string | null;
  monthly_due: number | null;
  months_owed: number | null;
  amount_owed: number | null;
  dues_calculated_at: string | null;
  has_paid_membership: boolean | null;
  membership_status: string | null;
  portrait_data_url: string | null;
  gender: string | null;
  ward_serial: string | null;
  phone_verified: boolean | null;
  phone_verified_at: string | null;
  phone_normalized: string | null;
  created_at: string;
  /** self | agent | cluster */
  registered_via: string;
  registered_by: string | null;
  pwd_identifies: boolean;
  pwd_category: string | null;
  pwd_category_other: string | null;
}

/** Insert shape (omit id, created_at - auto-generated) */
export type DbMemberInsert = Omit<DbMember, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

/** Diaspora supporter row (no PVC / ward; separate from `members`) */
export interface DbDiasporaSupporter {
  id: string;
  surname: string;
  first_name: string;
  email: string;
  phone_e164: string;
  phone_country_iso2: string;
  residence_country_iso2: string;
  residence_city: string;
  residence_address: string;
  nigeria_state_id: string;
  nigeria_lga_id: string;
  nigeria_state_name: string;
  nigeria_lga_name: string;
  vin: string | null;
  portrait_data_url: string | null;
  id_document_data_url: string | null;
  created_at: string;
  registered_via: string;
}

export type DbDiasporaSupporterInsert = Omit<
  DbDiasporaSupporter,
  "id" | "created_at"
> & {
  id?: string;
  created_at?: string;
};
