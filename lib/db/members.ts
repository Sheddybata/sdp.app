import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DbMember, DbMemberInsert } from "./types";
import type { MemberRecord } from "@/lib/mock-members";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { MOCK_MEMBERS, filterMembers, getKpis } from "@/lib/mock-members";
import { normalizePhone } from "@/lib/otp/termii";
import { getWardCodes } from "@/lib/location-codes";
import { calculateMembershipDues, DEFAULT_MONTHLY_DUE_NGN } from "@/lib/membership/dues";

type AdminSupabaseClient = NonNullable<ReturnType<typeof createAdminClient>>;

function dbToMember(row: DbMember): MemberRecord {
  return {
    id: row.id,
    title: row.title as MemberRecord["title"],
    surname: row.surname,
    firstName: row.first_name,
    otherNames: row.other_names ?? undefined,
    nin: row.nin,
    phone: row.phone,
    email: row.email ?? undefined,
    dateOfBirth: row.date_of_birth ?? "",
    address: row.address ?? "",
    joinDate: row.join_date ?? undefined,
    state: row.state,
    lga: row.lga,
    ward: row.ward,
    pollingUnit: row.polling_unit ?? "",
    voterRegistrationNumber: row.voter_registration_number,
    portraitDataUrl: row.portrait_data_url ?? "",
    agreedToConstitution: true,
    wardSerial: row.ward_serial ?? undefined,
    locationMembershipId: row.location_membership_id ?? undefined,
    membershipId: row.membership_id ?? undefined,
    phoneVerified: row.phone_verified ?? false,
    gender: (row.gender as "Male" | "Female") ?? undefined,
    monthlyDue: row.monthly_due ?? undefined,
    monthsOwed: row.months_owed ?? undefined,
    amountOwed: row.amount_owed ?? undefined,
    duesCalculatedAt: row.dues_calculated_at ?? undefined,
    hasPaidMembership: row.has_paid_membership ?? undefined,
    membershipStatus: row.membership_status ?? undefined,
    createdAt: row.created_at,
    registeredBy: row.registered_by ?? undefined,
    // Note: membership_id is stored but we still compute it for consistency
    // The stored value is used for lookups, computed value for display
  };
}

function formToDbInsert(
  data: EnrollmentFormData,
  wardSerial?: string,
  locationMembershipId?: string
): DbMemberInsert {
  // If we have a location-based ID, use it as the primary membership_id; otherwise fall back
  const fallbackMembershipId = getMembershipIdFromData({
    surname: data.surname,
    voterRegistrationNumber: data.voterRegistrationNumber,
  }).toUpperCase();

  const joinDateISO = data.joinDate || new Date().toISOString().slice(0, 10);
  const dues = calculateMembershipDues({
    joinDateISO,
    monthlyDue: DEFAULT_MONTHLY_DUE_NGN,
  });

  return {
    title: data.title,
    surname: data.surname,
    first_name: data.firstName,
    other_names: data.otherNames || null,
    nin: data.nin,
    phone: data.phone,
    email: data.email || null,
    date_of_birth: data.dateOfBirth || null,
    address: data.address || null,
    join_date: joinDateISO || null,
    state: data.state,
    lga: data.lga,
    ward: data.ward,
    polling_unit: data.pollingUnit || null,
    voter_registration_number: data.voterRegistrationNumber.replace(/\s/g, ""),
    membership_id: locationMembershipId || fallbackMembershipId,
    location_membership_id: locationMembershipId || null,
    portrait_data_url: data.portraitDataUrl || null,
    ward_serial: wardSerial || null,
    gender: null,
    phone_verified: data.phoneVerified ?? false,
    phone_verified_at: data.phoneVerified ? new Date().toISOString() : null,
    phone_normalized: normalizePhone(data.phone) || null,
    registered_by: null,
    monthly_due: dues.monthlyDue,
    months_owed: dues.monthsOwed,
    amount_owed: dues.amountOwed,
    dues_calculated_at: new Date().toISOString(),
    has_paid_membership: false,
    membership_status: "unpaid",
  };
}

async function generateWardSerial(
  supabase: AdminSupabaseClient,
  state: string,
  lga: string,
  ward: string
): Promise<string | null> {
  if (!state || !lga || !ward) return null;
  const { data, error } = await supabase.rpc("next_ward_serial", {
    _state: state,
    _lga: lga,
    _ward: ward,
  });
  if (error) {
    console.error("[ENROLLMENT] Ward serial generation failed:", error);
    throw new Error("Could not generate ward serial. Please try again.");
  }
  return (data as string) ?? null;
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
    const wardSerial = await generateWardSerial(supabase, data.state, data.lga, data.ward);
    const codes = getWardCodes(data.state, data.lga, data.ward);
    if (!codes) {
      console.error("[ENROLLMENT] Location codes not found for", data.state, data.lga, data.ward);
      return {
        ok: false,
        error: "We could not assign a location-based ID for your state/LGA/ward. Please review your selections and try again.",
      };
    }
    if (!wardSerial) {
      console.error("[ENROLLMENT] Ward serial not generated for", data.state, data.lga, data.ward);
      return {
        ok: false,
        error: "We could not assign a ward serial for your location. Please try again.",
      };
    }
    const locationMembershipId =
      `${codes.stateCode}-${codes.lgaCode}-${codes.wardCode}-${wardSerial}`;

    const insert = formToDbInsert(data, wardSerial || undefined, locationMembershipId || undefined);
    const { data: row, error } = await supabase
      .from("members")
      .insert(insert)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        const msg = String((error as unknown as { message?: string }).message ?? "");
        const constraint = String((error as unknown as { constraint?: string }).constraint ?? "");
        const combined = `${constraint} ${msg}`.toLowerCase();

        if (combined.includes("idx_members_voter_unique") || combined.includes("voter_registration_number")) {
          return {
            ok: false,
            error:
              "This voter registration number is already registered. If you believe this is an error, please contact support.",
          };
        }
        if (combined.includes("idx_members_nin_unique") || combined.includes(" nin")) {
          return {
            ok: false,
            error:
              "This NIN is already registered. Please double-check the number or contact support if you believe this is an error.",
          };
        }
        if (combined.includes("idx_members_phone_normalized_unique") || combined.includes("phone_normalized")) {
          return {
            ok: false,
            error:
              "This phone number is already registered. Please use a different phone number or contact support if you believe this is an error.",
          };
        }
        if (combined.includes("idx_members_membership_id_unique") || combined.includes("membership_id")) {
          return {
            ok: false,
            error:
              "A member with these details already exists. Please double-check your voter registration number and surname, or contact support.",
          };
        }
        if (
          combined.includes("idx_members_location_membership_id_unique") ||
          combined.includes("location_membership_id")
        ) {
          return {
            ok: false,
            error:
              "A member with these location details already exists. Please contact support so we can resolve this.",
          };
        }

        return {
          ok: false,
          error:
            "This member is already registered (duplicate record). Please double-check your details or contact support if you believe this is an error.",
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
    const isTimeout = err instanceof Error && err.message === "Database request timed out";
    if (err instanceof Error && err.message && !isTimeout) {
      // Surface known, user-safe messages thrown by our own code paths.
      // This avoids masking real causes as a generic error.
      return {
        ok: false,
        error: err.message,
      };
    }
    return {
      ok: false,
      error: isTimeout
        ? "The connection is taking too long. Check your internet connection and that Supabase is set up, then try again."
        : "An unexpected error occurred. Please try again in a few moments. If the problem persists, contact support.",
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
      if (q) {
        query = query.or(
          `surname.ilike.%${q}%,first_name.ilike.%${q}%,voter_registration_number.ilike.%${q}%,phone.ilike.%${q}%,nin.ilike.%${q}%,polling_unit.ilike.%${q}%,address.ilike.%${q}%`
        );
      }
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
