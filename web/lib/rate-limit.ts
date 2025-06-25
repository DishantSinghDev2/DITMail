import type { NextRequest } from "next/server"
import { redis } from "./redis"

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest) => string
}

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const key = options.keyGenerator ? options.keyGenerator(request) : request.headers.get("x-forwarded-for") || "unknown"

  const rateLimitKey = `rate_limit:${key}`
  const windowStart = Math.floor(Date.now() / options.windowMs) * options.windowMs

  try {
    const current = await redis.get(`${rateLimitKey}:${windowStart}`)
    const requests = current ? Number.parseInt(current) : 0

    if (requests >= options.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: windowStart + options.windowMs,
      }
    }

    await redis.incr(`${rateLimitKey}:${windowStart}`)
    await redis.expire(`${rateLimitKey}:${windowStart}`, Math.ceil(options.windowMs / 1000))

    return {
      success: true,
      remaining: options.maxRequests - requests - 1,
      resetTime: windowStart + options.windowMs,
    }
  } catch (error) {
    console.error("Rate limiting error:", error)
    // Allow request if Redis is down
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetTime: windowStart + options.windowMs,
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
