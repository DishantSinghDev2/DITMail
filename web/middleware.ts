import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createRateLimiter } from "./lib/rate-limit"

// Rate limiters for different endpoints
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => req.headers.get("x-forwarded-for") || "unknown",
})

const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyGenerator: (req) => req.headers.get("x-forwarded-for") || "unknown",
})

const smtpBridgeRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000, // 1000 requests per minute for SMTP
  keyGenerator: (req) => req.headers.get("x-forwarded-for") || "unknown",
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Security headers
  const response = NextResponse.next()
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // SMTP Bridge - localhost only with high rate limit
  if (pathname.startsWith("/api/auth/bridge") || pathname.startsWith("/api/smtp/")) {
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "127.0.0.1"

    if (ip !== "127.0.0.1" && ip !== "::1") {
      console.warn("Unauthorized access attempt to SMTP endpoint", { ip, pathname })
      return new NextResponse("Forbidden", { status: 403 })
    }

    const rateLimitResult = await smtpBridgeRateLimit(request)
    if (rateLimitResult) return rateLimitResult
  }

  // Auth endpoints - strict rate limiting
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/register")) {
    const rateLimitResult = await authRateLimit(request)
    if (rateLimitResult) return rateLimitResult
  }

  // General API rate limiting
  if (pathname.startsWith("/api/")) {
    const rateLimitResult = await apiRateLimit(request)
    if (rateLimitResult) return rateLimitResult
  }

  // Admin routes - additional security
  if (pathname.startsWith("/admin")) {
    // Add additional security headers for admin
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    response.headers.set("Pragma", "no-cache")
  }

  return response
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
}
