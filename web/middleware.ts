// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRateLimiter } from "./lib/rate-limit"; // Correct path

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
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response: NextResponse | null = null;

  // --- Step 1: Apply Rate Limiting ---
  // The first limiter that returns a response (a 429) will be used.
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/register")) {
    response = await authRateLimit(request);
  } else if (pathname.startsWith("/api/smtp") || pathname.startsWith("/api/auth/bridge")) {
    response = await smtpBridgeRateLimit(request);
  } else if (pathname.startsWith("/api/")) {
    response = await apiRateLimit(request);
  }

  // If a rate limit was triggered, we stop here and return the 429 response.
  // We will add security headers to it before returning.
  if (response) {
     // Apply security headers to the rate limit response before returning
     applySecurityHeaders(response);
     return response;
  }

  // --- Step 2: Path-Specific Logic (if not rate-limited) ---
  // Check for SMTP bridge access from localhost ONLY
  if (pathname.startsWith("/api/smtp") || pathname.startsWith("/api/auth/bridge")) {
    // In a production environment behind a proxy, `request.ip` might be the proxy's IP.
    // Ensure your hosting provider correctly sets the IP header (Vercel does).
    const ip = request.ip ?? "127.0.0.1";
    const allowedIps = ["127.0.0.1", "::1"]; // Allow IPv4 and IPv6 localhost
    if (!allowedIps.includes(ip)) {
      console.warn(`[403] Forbidden access attempt to SMTP endpoint from IP: ${ip}`);
      // Create a new response for the forbidden error
      const forbiddenResponse = new NextResponse("Forbidden", { status: 403 });
      applySecurityHeaders(forbiddenResponse); // Secure this response too
      return forbiddenResponse;
    }
  }
  
  // --- Step 3: Prepare the Normal Response ---
  // If we've gotten this far, the request is allowed.
  const normalResponse = NextResponse.next();

  // --- Step 4: Apply All Headers to the Final Response ---
  applySecurityHeaders(normalResponse);
  
  if (pathname.startsWith("/admin")) {
    applyAdminHeaders(normalResponse);
  }

  return normalResponse;
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