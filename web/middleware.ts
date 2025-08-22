// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRateLimiter } from "./lib/rate-limit"; // Correct path
import { getToken } from "next-auth/jwt";

// --- Rate Limiter Configurations ---
// Stricter limit for authentication attempts
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
});

// General API limit
const apiRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 100,
});

// High-throughput limit for trusted local services
const smtpBridgeRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 1000,
});

// --- Main Middleware Logic ---
// --- Main Middleware Logic ---
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Step 1: Session Check for Protected Routes ---
  // We check for a session on all routes protected by the matcher
  // except for the auth API routes themselves.
  if (!pathname.startsWith('/api/auth')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    // If there is no token (user is not logged in)
    if (!token) {
      const signInUrl = new URL("/api/auth/signin/wyi", request.url);
      // Append a callbackUrl so the user is redirected back to the
      // page they originally tried to visit after logging in.
      signInUrl.searchParams.set("callbackUrl", request.url);
      
      // Redirect to the NextAuth.js sign-in page. Because we have only one
      // OAuth provider and no custom login page, NextAuth will automatically
      // redirect from here to the WYI OAuth screen.
      return NextResponse.redirect(signInUrl);
    }
  }
  // --- Step 3: Path-Specific Logic (if allowed) ---
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
  
  // --- Step 4: Prepare and Secure the Normal Response ---
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
  // Add Content-Security-Policy here for even stronger security
  // response.headers.set("Content-Security-Policy", "default-src 'self'; ...");
}

function applyAdminHeaders(response: NextResponse) {
  // Prevent caching of sensitive admin pages
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
}


// --- Matcher Configuration ---
export const config = {
  // Apply the middleware to API routes, admin routes, and the root.
  // We exclude static files and images to avoid unnecessary processing.
  matcher: ["/api/:path*", "/admin/:path*"],
};