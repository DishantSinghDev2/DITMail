// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRateLimiter } from "./lib/rate-limit"; 
import { getToken } from "next-auth/jwt";

// --- Rate Limiter Configurations ---
const apiRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 100,
});

// --- Main Middleware Logic ---
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Step 1: Redirect logged-in users from "/" → "/mail/inbox"
  if (pathname === "/") {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token) {
      const url = request.nextUrl.clone();
      url.pathname = "/mail/inbox";
      return NextResponse.redirect(url);
    }
  }

  // --- Step 2: Restrict SMTP/Auth Bridge to localhost only ---
  if (pathname.startsWith("/api/smtp") || pathname.startsWith("/api/auth/bridge")) {
    const ip = request.ip ?? "127.0.0.1";
    const allowedIps = ["127.0.0.1", "::1"];
    if (!allowedIps.includes(ip)) {
      console.warn(`[403] Forbidden access attempt to SMTP endpoint from IP: ${ip}`);
      const forbiddenResponse = new NextResponse("Forbidden", { status: 403 });
      applySecurityHeaders(forbiddenResponse);
      return forbiddenResponse;
    }
  }

  // --- Step 3: Normal request processing ---
  const response = NextResponse.next();
  applySecurityHeaders(response);

  if (pathname.startsWith("/admin")) {
    applyAdminHeaders(response);
  }

  return response;
}

// --- Helper Functions for Headers ---
function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

function applyAdminHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
}

// --- Matcher Configuration ---
export const config = {
  matcher: ["/", "/api/:path*", "/admin/:path*"], // include "/" so root logic runs
};
