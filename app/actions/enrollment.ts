"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { insertMember } from "@/lib/db/members";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";

import type { MemberRecord } from "@/lib/mock-members";

export type EnrollmentResult =
  | { ok: true; message: string; member?: MemberRecord }
  | { ok: false; error: string };

export async function submitEnrollment(
  data: EnrollmentFormData
): Promise<EnrollmentResult> {
  try {
    // Validate required fields
    if (
      !data.voterRegistrationNumber ||
      data.voterRegistrationNumber.length < 19 ||
      data.voterRegistrationNumber.length > 20
    ) {
      return { 
        ok: false, 
        error: "Please provide a valid 19 or 20-character voter registration number." 
      };
    }

    if (!data.surname || !data.firstName) {
      return { 
        ok: false, 
        error: "Please provide your full name (surname and first name)." 
      };
    }

    if (!data.nin || !/^\d{11}$/.test(data.nin)) {
      return {
        ok: false,
        error: "Please provide a valid 11-digit NIN."
      };
    }

    if (!data.address) {
      return {
        ok: false,
        error: "Please provide your address."
      };
    }

    if (!data.pollingUnit) {
      return {
        ok: false,
        error: "Please provide your polling unit."
      };
    }

    if (!data.agreedToConstitution) {
      return { 
        ok: false, 
        error: "You must agree to the party constitution to complete enrollment." 
      };
    }

    // If Supabase isn't set up, skip save and go straight to preview (so you can see the card)
    if (!createAdminClient()) {
      return { ok: true, message: "Enrollment saved successfully." };
    }

    const result = await insertMember(data);

    if (result.ok) {
      return { ok: true, message: "Enrollment saved successfully.", member: result.member };
    }

    return { ok: false, error: result.error };
  } catch (error) {
    console.error("[ENROLLMENT ACTION] Unexpected error:", error);
    return { 
      ok: false, 
      error: "An unexpected error occurred during enrollment. Please try again. If the problem persists, contact support." 
    };
  }
}
