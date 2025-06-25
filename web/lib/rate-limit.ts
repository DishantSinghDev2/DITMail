import type { NextRequest } from "next/server"

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest) => string
}

// Simple in-memory rate limiting for Edge Runtime
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const key = options.keyGenerator ? options.keyGenerator(request) : request.headers.get("x-forwarded-for") || "unknown"
  const now = Date.now()
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs
  const resetTime = windowStart + options.windowMs
  const rateLimitKey = `${key}:${windowStart}`

  try {
    const current = rateLimitStore.get(rateLimitKey)

    if (!current || now > current.resetTime) {
      // Reset or initialize counter
      rateLimitStore.set(rateLimitKey, { count: 1, resetTime })
      return {
        success: true,
        remaining: options.maxRequests - 1,
        resetTime,
      }
    }

    if (current.count >= options.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: current.resetTime,
      }
    }

    // Increment counter
    current.count++
    rateLimitStore.set(rateLimitKey, current)

    return {
      success: true,
      remaining: options.maxRequests - current.count,
      resetTime: current.resetTime,
    }
  } catch (error) {
    console.error("Rate limiting error:", error)
    // Allow request if there's an error
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetTime,
    }
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  return async (request: NextRequest) => {
    const result = await rateLimit(request, options)

    if (!result.success) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": options.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetTime.toString(),
          "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      })
    }

    return null // Continue with request
  }
}
