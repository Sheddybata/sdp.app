type OtpResult =
  | { ok: true; pinId?: string }
  | { ok: false; error: string };

const apiKey = process.env.TERMII_API_KEY;
const senderId = process.env.TERMII_SENDER_ID || "N-Alert";
const apiBase = process.env.TERMII_API_BASE || "https://api.ng.termii.com";

/** Basic E.164 validation with Nigerian conveniences. */
export function normalizePhone(phone: string): string | null {
  const trimmed = (phone || "").trim();
  if (!trimmed) return null;
  let cleaned = trimmed.replace(/\s+/g, "");

  // Nigerian helper: 080… -> +23480…, 23480… -> +23480…
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
  if (!apiKey) {
    return { ok: false, error: "Termii API key is not configured." };
  }

  try {
    const res = await fetch(`${apiBase}/api/sms/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        message_type: "NUMERIC",
        to: phone,
        from: senderId,
        channel: "generic",
        pin_attempts: 5,
        pin_time_to_live: 10, // minutes
        pin_length: 6,
        pin_placeholder: "<123456>",
        message_text: "Your SDP verification code is <123456>",
        pin_type: "NUMERIC",
      }),
    });

    const data = (await res.json()) as any;

    if (!res.ok || !data?.pinId) {
      const msg =
        (data && (data.message || data.error || data.message_id)) ||
        "Could not send code. Check your Termii credentials or sender ID.";
      return { ok: false, error: String(msg) };
    }

    return { ok: true, pinId: data.pinId as string };
  } catch (err) {
    console.error("[OTP] Termii send failed", err);
    const msg =
      err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
        ? (err as any).message
        : "Could not send code. Please try again.";
    return { ok: false, error: msg };
  }
}

export async function verifyOtp(pinId: string, code: string): Promise<OtpResult> {
  if (!apiKey) {
    return { ok: false, error: "Termii API key is not configured." };
  }

  try {
    const res = await fetch(`${apiBase}/api/sms/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        pin_id: pinId,
        pin: code,
      }),
    });

    const data = (await res.json()) as any;

    // Termii returns verified: true on success
    if (res.ok && data?.verified === true) {
      return { ok: true };
    }

    const msg =
      (data && (data.message || data.error || data.message_id)) ||
      "Code is incorrect or expired.";
    return { ok: false, error: String(msg) };
  } catch (err) {
    console.error("[OTP] Termii verify failed", err);
    const msg =
      err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
        ? (err as any).message
        : "Code is incorrect or expired.";
    return { ok: false, error: msg };
  }
}
