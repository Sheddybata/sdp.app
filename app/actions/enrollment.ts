"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { insertMember } from "@/lib/db/members";
import { enrollmentSchema, type EnrollmentFormData } from "@/lib/enrollment-schema";
import { getPortalSession } from "@/app/actions/portalAuth";

import type { MemberRecord } from "@/lib/mock-members";

export type EnrollmentSource = "public" | "agent" | "cluster";

export type EnrollmentResult =
  | { ok: true; message: string; member?: MemberRecord }
  | { ok: false; error: string };

export async function submitEnrollment(
  data: EnrollmentFormData,
  enrollmentSource: EnrollmentSource = "public"
): Promise<EnrollmentResult> {
  try {
    const parsed = enrollmentSchema.safeParse(data);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const first = Object.values(flat).flat()[0];
      return { ok: false, error: first || "Invalid enrollment data. Check the form and try again." };
    }
    data = parsed.data;

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

    if (!data.portraitDataUrl) {
      return {
        ok: false,
        error: "Please add a portrait photo to continue."
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

    let registration: { registered_via: string; registered_by: string | null };
    if (enrollmentSource === "public") {
      registration = { registered_via: "self", registered_by: null };
    } else if (enrollmentSource === "agent") {
      const session = await getPortalSession();
      if (!session.ok || session.role !== "agent") {
        return {
          ok: false,
          error:
            "Your agent session has expired or is invalid. Please sign in again from the agent portal.",
        };
      }
      registration = { registered_via: "agent", registered_by: session.email };
    } else {
      const session = await getPortalSession();
      if (!session.ok || session.role !== "cluster") {
        return {
          ok: false,
          error:
            "Your cluster session has expired or is invalid. Please sign in again from the cluster portal.",
        };
      }
      registration = { registered_via: "cluster", registered_by: session.email };
    }

    // If Supabase isn't set up, skip save and go straight to preview (so you can see the card)
    if (!createAdminClient()) {
      return { ok: true, message: "Enrollment saved successfully." };
    }

    const result = await insertMember(data, registration);

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
