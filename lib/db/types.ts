/** Database row shape for members table (snake_case from Supabase) */
export interface DbMember {
  id: string;
  title: string;
  surname: string;
  first_name: string;
  other_names: string | null;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  join_date: string | null;
  state: string;
  lga: string;
  ward: string;
  voter_registration_number: string;
  membership_id: string | null;
  portrait_data_url: string | null;
  gender: string | null;
  created_at: string;
  registered_by: string | null;
}

/** Insert shape (omit id, created_at - auto-generated) */
export type DbMemberInsert = Omit<DbMember, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};
