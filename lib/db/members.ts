import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DbMember, DbMemberInsert } from "./types";
import type { MemberRecord } from "@/lib/mock-members";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { MOCK_MEMBERS, filterMembers, getKpis } from "@/lib/mock-members";

function dbToMember(row: DbMember): MemberRecord {
  return {
    id: row.id,
    title: row.title as MemberRecord["title"],
    surname: row.surname,
    firstName: row.first_name,
    otherNames: row.other_names ?? undefined,
    phone: row.phone,
    email: row.email ?? undefined,
    dateOfBirth: row.date_of_birth ?? "",
    joinDate: row.join_date ?? undefined,
    state: row.state,
    lga: row.lga,
    ward: row.ward,
    voterRegistrationNumber: row.voter_registration_number,
    portraitDataUrl: row.portrait_data_url ?? undefined,
    agreedToConstitution: true,
    gender: (row.gender as "Male" | "Female") ?? undefined,
    createdAt: row.created_at,
    registeredBy: row.registered_by ?? undefined,
    // Note: membership_id is stored but we still compute it for consistency
    // The stored value is used for lookups, computed value for display
  };
}

function formToDbInsert(data: EnrollmentFormData): DbMemberInsert {
  // Compute membership ID and store it (ensure uppercase)
  const membershipId = getMembershipIdFromData({
    surname: data.surname,
    voterRegistrationNumber: data.voterRegistrationNumber,
  }).toUpperCase(); // Double-check it's uppercase

  return {
    title: data.title,
    surname: data.surname,
    first_name: data.firstName,
    other_names: data.otherNames || null,
    phone: data.phone,
    email: data.email || null,
    date_of_birth: data.dateOfBirth || null,
    join_date: data.joinDate || null,
    state: data.state,
    lga: data.lga,
    ward: data.ward,
    voter_registration_number: data.voterRegistrationNumber.replace(/\s/g, ""),
    membership_id: membershipId,
    portrait_data_url: data.portraitDataUrl || null,
    gender: null,
    registered_by: null,
  };
}

/** Check if Supabase is configured */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Insert a new member (enrollment). Returns member or error. */
export async function insertMember(
  data: EnrollmentFormData
): Promise<{ ok: true; member: MemberRecord } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { 
      ok: false, 
      error: "Our enrollment system is temporarily unavailable. Please try again later or contact support if the problem persists." 
    };
  }

  try {
    const insert = formToDbInsert(data);
    const { data: row, error } = await supabase
      .from("members")
      .insert(insert)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { 
          ok: false, 
          error: "This voter registration number is already registered. If you believe this is an error, please contact support." 
        };
      }
      if (error.code === "23503") {
        return { 
          ok: false, 
          error: "There was an issue with your enrollment data. Please check all fields and try again." 
        };
      }
      console.error("[ENROLLMENT] Database error:", error);
      return { 
        ok: false, 
        error: "We couldn't save your enrollment. Please check your internet connection and try again. If the problem continues, contact support." 
      };
    }

    if (!row) {
      return { 
        ok: false, 
        error: "Your enrollment was submitted but we couldn't retrieve your membership details. Please contact support with your voter registration number." 
      };
    }

    return { ok: true, member: dbToMember(row as DbMember) };
  } catch (err) {
    console.error("[ENROLLMENT] Unexpected error:", err);
    return { 
      ok: false, 
      error: "An unexpected error occurred. Please try again in a few moments. If the problem persists, contact support." 
    };
  }
}

/** Find member by voter registration number (normalized, no spaces). */
export async function getMemberByVoterId(
  voterIdRaw: string
): Promise<MemberRecord | null> {
  // Use admin client for more reliable access (bypasses RLS)
  // This is safe for verification as we're only doing SELECT queries
  const supabase = createAdminClient();
  if (!supabase) {
    // Fallback to anon client
    const anonSupabase = await createClient();
    if (!anonSupabase) {
      console.warn("[VERIFY] Supabase not configured, using mock data");
      return MOCK_MEMBERS.find(
        (m) => (m.voterRegistrationNumber || "").replace(/\s/g, "") === voterIdRaw
      ) ?? null;
    }
    
    const { data, error } = await anonSupabase
      .from("members")
      .select("*")
      .eq("voter_registration_number", voterIdRaw)
      .maybeSingle();

    if (error) {
      console.error("[VERIFY] Error fetching member by voter ID (anon):", error);
      return null;
    }
    
    if (!data) {
      console.log("[VERIFY] No member found with voter ID:", voterIdRaw);
      return null;
    }
    
    return dbToMember(data as DbMember);
  }

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("voter_registration_number", voterIdRaw)
    .maybeSingle();

  if (error) {
    console.error("[VERIFY] Error fetching member by voter ID:", error);
    return null;
  }
  
  if (!data) {
    console.log("[VERIFY] No member found with voter ID:", voterIdRaw);
    return null;
  }
  
  return dbToMember(data as DbMember);
}

/** Find member by membership ID (SDP-XXX-NNNNNN). */
export async function getMemberByMembershipId(
  membershipId: string
): Promise<MemberRecord | null> {
  const normalized = membershipId.replace(/\s/g, "").toUpperCase().trim();
  if (!normalized || normalized.length < 6) {
    console.log("[VERIFY] Invalid membership ID format:", membershipId);
    return null;
  }

  // Validate format: SDP-XXX-NNNNNN
  const parts = normalized.split("-");
  if (parts.length !== 3 || parts[0] !== "SDP") {
    console.log("[VERIFY] Invalid membership ID format:", normalized);
    return null;
  }

  // Use admin client for more reliable access (bypasses RLS)
  // This is safe for verification as we're only doing SELECT queries
  const supabase = createAdminClient();
  if (!supabase) {
    // Fallback to anon client
    const anonSupabase = await createClient();
    if (!anonSupabase) {
      console.warn("[VERIFY] Supabase not configured, using mock data");
      return MOCK_MEMBERS.find(
        (m) => getMembershipIdFromData(m) === normalized
      ) ?? null;
    }

    // Case-insensitive lookup - try exact match first, then ilike
    let { data, error } = await anonSupabase
      .from("members")
      .select("*")
      .eq("membership_id", normalized)
      .maybeSingle();
    
    // If not found, try case-insensitive match
    if (!data && !error) {
      const result = await anonSupabase
        .from("members")
        .select("*")
        .ilike("membership_id", normalized)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("[VERIFY] Error fetching member by membership ID (anon):", error);
      return null;
    }

    if (!data) {
      console.log("[VERIFY] No member found with membership ID:", normalized);
      return null;
    }

    console.log("[VERIFY] Member found:", data.id);
    return dbToMember(data as DbMember);
  }

  // Case-insensitive lookup - try exact match first, then ilike
  let { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("membership_id", normalized)
    .maybeSingle();
  
  // If not found, try case-insensitive match
  if (!data && !error) {
    const result = await supabase
      .from("members")
      .select("*")
      .ilike("membership_id", normalized)
      .maybeSingle();
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error("[VERIFY] Error fetching member by membership ID:", error);
    return null;
  }

  if (!data) {
    console.log("[VERIFY] No member found with membership ID:", normalized);
    return null;
  }

  console.log("[VERIFY] Member found:", data.id);
  return dbToMember(data as DbMember);
}

/** Get all members for admin. Returns empty array if Supabase not configured or error occurs. */
export async function getMembers(opts?: {
  search?: string;
  state?: string;
  lga?: string;
  ward?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<MemberRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) {
    console.warn("[ADMIN] Supabase not configured, returning empty array");
    return [];
  }

  try {
    let query = supabase.from("members").select("*").order("created_at", { ascending: false });

    if (opts?.search) {
      const q = opts.search.toLowerCase().replace(/[%_]/g, "");
      if (q) query = query.or(`surname.ilike.%${q}%,first_name.ilike.%${q}%,voter_registration_number.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    if (opts?.state) query = query.eq("state", opts.state);
    if (opts?.lga) query = query.eq("lga", opts.lga);
    if (opts?.ward) query = query.eq("ward", opts.ward);
    if (opts?.dateFrom) query = query.gte("join_date", opts.dateFrom);
    if (opts?.dateTo) query = query.lte("join_date", opts.dateTo);

    const { data, error } = await query;

    if (error) {
      console.error("[ADMIN] Error fetching members:", error);
      return [];
    }

    return (data ?? []).map((r) => dbToMember(r as DbMember));
  } catch (err) {
    console.error("[ADMIN] Exception fetching members:", err);
    return [];
  }
}

/** Get KPIs for admin. Returns zeros if no members found. */
export async function getMembersKpis() {
  const members = await getMembers();
  return getKpis(members);
}
