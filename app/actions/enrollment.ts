"use server";

import { insertMember } from "@/lib/db/members";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";

export type EnrollmentResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function submitEnrollment(
  data: EnrollmentFormData
): Promise<EnrollmentResult> {
  try {
    // Validate required fields
    if (!data.voterRegistrationNumber || data.voterRegistrationNumber.length !== 20) {
      return { 
        ok: false, 
        error: "Please provide a valid 20-character voter registration number." 
      };
    }

    if (!data.surname || !data.firstName) {
      return { 
        ok: false, 
        error: "Please provide your full name (surname and first name)." 
      };
    }

    if (!data.agreedToConstitution) {
      return { 
        ok: false, 
        error: "You must agree to the party constitution to complete enrollment." 
      };
    }

    const result = await insertMember(data);

    if (result.ok) {
      return { ok: true, message: "Enrollment saved successfully." };
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
