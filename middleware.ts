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
      const decoded = decodeBase64(sessionCookie.value);
      if (!decoded || !decoded.includes(":")) {
        // Invalid session format, redirect to login
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
        const decoded = decodeBase64(sessionCookie.value);
        if (decoded && decoded.includes(":")) {
          // Session exists, redirect to dashboard (full validation happens server-side)
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
