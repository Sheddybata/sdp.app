import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple base64 decode for Edge Runtime
function decodeBase64(str: string): string {
  try {
    // Use atob which is available in Edge Runtime
    return atob(str);
  } catch {
    return "";
  }
}

function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "admin@sdp.org").trim().toLowerCase();
}

function getSessionSecret(): string {
  return (process.env.SESSION_SECRET || "change-this-secret-in-production").trim();
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const decoded = decodeBase64(token);
  if (!decoded || !decoded.includes(":")) return false;

  const [emailRaw, tsRaw, signature] = decoded.split(":");
  if (!emailRaw || !tsRaw || !signature) return false;

  const email = emailRaw.trim().toLowerCase();
  const expectedEmail = getAdminEmail();
  if (email !== expectedEmail) return false;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return false;

  const ageSeconds = (Date.now() - ts) / 1000;
  if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) return false;

  const payload = `${emailRaw}:${tsRaw}`;
  const expectedSignature = await hmacSha256Hex(getSessionSecret(), payload);
  if (signature !== expectedSignature) return false;

  return true;
}

export async function middleware(request: NextRequest) {
  // Only protect /admin routes (except /admin/login)
  if (request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
    const sessionCookie = request.cookies.get("admin_session");
    
    if (!sessionCookie?.value) {
      // Redirect to login if no session
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Basic validation - full validation happens in server actions
    // Just check that cookie exists and has a value
    try {
      if (!(await isValidSessionToken(sessionCookie.value))) {
        // Invalid session format or expired, redirect to login
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.delete("admin_session");
        return response;
      }
    } catch {
      // Invalid session format, redirect to login
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("admin_session");
      return response;
    }
  }

  // If accessing /admin/login while already authenticated, redirect to admin dashboard
  if (request.nextUrl.pathname === "/admin/login") {
    const sessionCookie = request.cookies.get("admin_session");
    
    if (sessionCookie?.value) {
      try {
        if (await isValidSessionToken(sessionCookie.value)) {
          // Session exists, redirect to dashboard
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // Invalid session, allow login page
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
