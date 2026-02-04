"use server";

import { getMemberByMembershipId, getMemberByVoterId } from "@/lib/db/members";
import { normalizeVoterIdInput } from "@/lib/enrollment-schema";
import type { MemberRecord } from "@/lib/mock-members";

export type VerifyResult =
  | { ok: true; member: MemberRecord }
  | { ok: false; error: string };

export async function verifyByMembershipId(
  membershipId: string
): Promise<VerifyResult> {
  try {
    // Validate input
    const trimmed = membershipId.trim();
    if (!trimmed) {
      return { ok: false, error: "Please enter a membership ID." };
    }

    if (trimmed.length < 6) {
      return { ok: false, error: "Membership ID is too short. Please check and try again." };
    }

    const member = await getMemberByMembershipId(trimmed);
    if (member) {
      return { ok: true, member };
    }
    
    return { 
      ok: false, 
      error: "Member not found. Please check the membership ID and try again. The format should be SDP-XXX-XXXXXX." 
    };
  } catch (error) {
    console.error("[VERIFY ACTION] Error in verifyByMembershipId:", error);
    return { 
      ok: false, 
      error: "We're having trouble connecting to our database. Please check your internet connection and try again." 
    };
  }
}

export async function verifyByVoterId(
  voterIdInput: string
): Promise<VerifyResult> {
  try {
    // Validate input
    const trimmed = voterIdInput.trim();
    if (!trimmed) {
      return { ok: false, error: "Please enter a voter registration number." };
    }

    const raw = normalizeVoterIdInput(trimmed);
    if (raw.length !== 20) {
      return { 
        ok: false, 
        error: `Voter ID must be exactly 20 characters. You entered ${raw.length} character${raw.length !== 1 ? 's' : ''}. Please check and try again.` 
      };
    }

    const member = await getMemberByVoterId(raw);
    if (member) {
      return { ok: true, member };
    }
    
    return { 
      ok: false, 
      error: "Member not found. Please check the voter registration number and try again. Make sure there are no spaces or extra characters." 
    };
  } catch (error) {
    console.error("[VERIFY ACTION] Error in verifyByVoterId:", error);
    return { 
      ok: false, 
      error: "We're having trouble connecting to our database. Please check your internet connection and try again." 
    };
  }
}
