import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PORTAL_SESSION_COOKIE_NAME } from "@/lib/portal-session-constants";

// Simple base64 decode for Edge Runtime
function decodeBase64(str: string): string {
  try {
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

const PORTAL_USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Portal token: base64(email:role:userId:timestamp:signatureHex) */
async function isValidPortalSessionToken(
  token: string | undefined,
  requiredRole: "agent" | "cluster"
): Promise<boolean> {
  if (!token) return false;
  const decoded = decodeBase64(token);
  if (!decoded) return false;
  const parts = decoded.split(":");
  if (parts.length < 5) return false;

  const signature = parts[parts.length - 1]!;
  const tsRaw = parts[parts.length - 2]!;
  const userId = parts[parts.length - 3]!;
  const roleRaw = parts[parts.length - 4]!;
  const email = parts.slice(0, -4).join(":").trim().toLowerCase();

  if (roleRaw !== "agent" && roleRaw !== "cluster") return false;
  if (roleRaw !== requiredRole) return false;
  if (!PORTAL_USER_ID_RE.test(userId)) return false;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return false;

  const ageSeconds = (Date.now() - ts) / 1000;
  if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) return false;

  const payload = `${email}:${roleRaw}:${userId}:${ts}`;
  const expectedSignature = await hmacSha256Hex(getSessionSecret(), payload);
  if (signature !== expectedSignature) return false;

  return true;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- Admin API (JSON / binary; same session as admin UI) ---
  if (path.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get("admin_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      if (!(await isValidSessionToken(sessionCookie.value))) {
        const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        response.cookies.delete("admin_session");
        return response;
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // --- Admin ---
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    const sessionCookie = request.cookies.get("admin_session");

    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      if (!(await isValidSessionToken(sessionCookie.value))) {
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.delete("admin_session");
        return response;
      }
    } catch {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("admin_session");
      return response;
    }
  }

  if (path === "/admin/login") {
    const sessionCookie = request.cookies.get("admin_session");
    if (sessionCookie?.value) {
      try {
        if (await isValidSessionToken(sessionCookie.value)) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // allow login page
      }
    }
  }

  // --- Agent portal ---
  const agentLoginPath = "/agent/login";
  const agentSignupPath = "/agent/signup";
  const isAgentPublic = path === agentLoginPath || path === agentSignupPath;
  const isAgentProtected = path.startsWith("/agent") && !isAgentPublic;

  if (isAgentProtected) {
    const portalCookie = request.cookies.get(PORTAL_SESSION_COOKIE_NAME);
    try {
      if (!(await isValidPortalSessionToken(portalCookie?.value, "agent"))) {
        const response = NextResponse.redirect(
          new URL(`${agentLoginPath}?next=${encodeURIComponent(path)}`, request.url)
        );
        response.cookies.delete(PORTAL_SESSION_COOKIE_NAME);
        return response;
      }
    } catch {
      const response = NextResponse.redirect(
        new URL(`${agentLoginPath}?next=${encodeURIComponent(path)}`, request.url)
      );
      response.cookies.delete(PORTAL_SESSION_COOKIE_NAME);
      return response;
    }
  }

  if (path === agentLoginPath || path === agentSignupPath) {
    const portalCookie = request.cookies.get(PORTAL_SESSION_COOKIE_NAME);
    if (portalCookie?.value) {
      try {
        if (await isValidPortalSessionToken(portalCookie.value, "agent")) {
          const next = request.nextUrl.searchParams.get("next");
          const safe =
            next && next.startsWith("/agent") && !next.startsWith(agentLoginPath)
              ? next
              : "/agent";
          return NextResponse.redirect(new URL(safe, request.url));
        }
      } catch {
        // allow login / signup page
      }
    }
  }

  // --- Cluster portal ---
  const clusterLoginPath = "/cluster/login";
  const clusterSignupPath = "/cluster/signup";
  const isClusterPublic = path === clusterLoginPath || path === clusterSignupPath;
  const isClusterProtected = path.startsWith("/cluster") && !isClusterPublic;

  if (isClusterProtected) {
    const portalCookie = request.cookies.get(PORTAL_SESSION_COOKIE_NAME);
    try {
      if (!(await isValidPortalSessionToken(portalCookie?.value, "cluster"))) {
        const response = NextResponse.redirect(
          new URL(`${clusterLoginPath}?next=${encodeURIComponent(path)}`, request.url)
        );
        response.cookies.delete(PORTAL_SESSION_COOKIE_NAME);
        return response;
      }
    } catch {
      const response = NextResponse.redirect(
        new URL(`${clusterLoginPath}?next=${encodeURIComponent(path)}`, request.url)
      );
      response.cookies.delete(PORTAL_SESSION_COOKIE_NAME);
      return response;
    }
  }

  if (path === clusterLoginPath || path === clusterSignupPath) {
    const portalCookie = request.cookies.get(PORTAL_SESSION_COOKIE_NAME);
    if (portalCookie?.value) {
      try {
        if (await isValidPortalSessionToken(portalCookie.value, "cluster")) {
          const next = request.nextUrl.searchParams.get("next");
          const safe =
            next && next.startsWith("/cluster") && !next.startsWith(clusterLoginPath)
              ? next
              : "/cluster";
          return NextResponse.redirect(new URL(safe, request.url));
        }
      } catch {
        // allow login / signup page
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/agent/:path*", "/cluster/:path*"],
};
