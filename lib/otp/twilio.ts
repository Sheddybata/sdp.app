import Twilio from "twilio";

type OtpResult =
  | { ok: true }
  | { ok: false; error: string };

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

function getClient() {
  if (!accountSid || !authToken) {
    return null;
  }
  try {
    return Twilio(accountSid, authToken);
  } catch (err) {
    console.error("[OTP] Failed to init Twilio client", err);
    return null;
  }
}

/** Basic E.164 validation (expects leading +). */
export function normalizePhone(phone: string): string | null {
  const trimmed = (phone || "").trim();
  if (!trimmed) return null;
  // Remove spaces
  let cleaned = trimmed.replace(/\s+/g, "");

  // Nigerian helper: allow local numbers like 08012345678 → +2348012345678
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("0") && cleaned.length >= 10) {
      cleaned = `+234${cleaned.slice(1)}`;
    } else if (cleaned.startsWith("234") && cleaned.length >= 11) {
      cleaned = `+${cleaned}`;
    } else {
      return null;
    }
  }

  if (!/^\+[0-9]{7,15}$/.test(cleaned)) return null;
  return cleaned;
}

export async function sendOtp(phone: string): Promise<OtpResult> {
  if (!verifyServiceSid) {
    return { ok: false, error: "Verify service is not configured." };
  }
  const client = getClient();
  if (!client) {
    return { ok: false, error: "SMS provider is unavailable." };
  }
  try {
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms" });
    return { ok: true };
  } catch (err) {
    console.error("[OTP] Failed to send code", err);
    const msg =
      err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
        ? (err as any).message
        : "Could not send code. Please try again.";
    return { ok: false, error: msg };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<OtpResult> {
  if (!verifyServiceSid) {
    return { ok: false, error: "Verify service is not configured." };
  }
  const client = getClient();
  if (!client) {
    return { ok: false, error: "SMS provider is unavailable." };
  }
  try {
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });

    if (check.status === "approved") {
      return { ok: true };
    }
    return { ok: false, error: "Code is incorrect or expired." };
  } catch (err) {
    console.error("[OTP] Failed to verify code", err);
    const msg =
      err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
        ? (err as any).message
        : "Code is incorrect or expired.";
    return { ok: false, error: msg };
  }
}
