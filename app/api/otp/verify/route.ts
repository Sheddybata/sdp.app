import { NextResponse } from "next/server";
import { normalizePhone, verifyOtp } from "@/lib/otp/termii";

export const runtime = "nodejs";

type VerifyRequest = {
  phone?: string;
  code?: string;
  pinId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequest;
    const normalized = normalizePhone(body.phone || "");
    if (!normalized) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid phone number in international format (e.g., +234...)." },
        { status: 400 }
      );
    }
    const pinId = (body.pinId || "").trim();
    if (!pinId) {
      return NextResponse.json(
        { ok: false, error: "Missing verification session. Please resend the code." },
        { status: 400 }
      );
    }

    const code = (body.code || "").trim();
    if (!/^[0-9]{4,8}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: "Enter the 6-digit code you received." },
        { status: 400 }
      );
    }

    const result = await verifyOtp(pinId, code);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, verified: true, phone: normalized });
  } catch (err) {
    console.error("[OTP] /api/otp/verify error", err);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
