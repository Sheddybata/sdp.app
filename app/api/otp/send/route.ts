import { NextResponse } from "next/server";
import { normalizePhone, sendOtp } from "@/lib/otp/termii";
import { isValidEnrollmentNigerianPhone } from "@/lib/phone-nigeria";

export const runtime = "nodejs";

type SendRequest = {
  phone?: string;
};

// Very lightweight in-memory rate limiter (per process). Good enough for dev; consider Redis in prod.
const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 3;
const buckets = new Map<string, { count: number; expires: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.expires < now) {
    buckets.set(key, { count: 1, expires: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendRequest;
    const raw = body.phone || "";
    if (!isValidEnrollmentNigerianPhone(raw)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Use a Nigerian mobile number: +234… or 234…, or local 070, 080, 081, 090, or 091 (then 8 more digits).",
        },
        { status: 400 }
      );
    }
    const normalized = normalizePhone(raw)!;

    const ip = request.headers.get("x-forwarded-for") || "ip-unknown";
    if (!checkRateLimit(`${ip}:${normalized}`)) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const result = await sendOtp(normalized);
    if (!result.ok) {
      // Surface provider/config errors as 400 so the client can show the message
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, pinId: result.pinId });
  } catch (err) {
    console.error("[OTP] /api/otp/send error", err);
    return NextResponse.json(
      { ok: false, error: "Could not send code. Please try again." },
      { status: 500 }
    );
  }
}
