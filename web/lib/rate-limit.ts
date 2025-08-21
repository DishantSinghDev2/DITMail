// lib/rate-limit.ts
import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
}

/**
 * IMPORTANT: This is an in-memory rate limiter.
 * In a serverless environment like Vercel's Edge Runtime, the memory (the 'store')
 * is NOT persistent across different function invocations. Each request is handled
 * by a new, separate instance.
 *
 * This means this rate limiter will only be effective for:
 * 1. Local development (`next dev`).
 * 2. Deployments to a single, long-running Node.js server instance.
 *
 * For production deployments on serverless platforms, a persistent external
 * store like Upstash Redis is STRONGLY recommended for true rate limiting.
 */
const store = new Map<string, { count: number; expiresAt: number }>();

// Periodically clean up expired entries to prevent memory leaks in long-running servers.
// Note: This has no effect in a serverless environment but is good practice.
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now > value.expiresAt) {
      store.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Creates a rate limiter middleware function.
 * @param options Configuration for the rate limiter.
 * @returns An async function that checks the request and returns a 429 response if limited, or null otherwise.
 */
export function createRateLimiter(options: RateLimitOptions) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Use the request IP or a custom key generator.
    const key = options.keyGenerator?.(request) ?? request.ip ?? "127.0.0.1";
    const now = Date.now();

    const current = store.get(key);
    
    // If the window has expired, reset the entry.
    if (!current || now > current.expiresAt) {
      store.set(key, {
        count: 1,
        expiresAt: now + options.windowMs,
      });
      return null; // Not limited
    }

    // If the request limit has been reached, block the request.
    if (current.count >= options.maxRequests) {
      const retryAfter = Math.ceil((current.expiresAt - now) / 1000);
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(options.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(current.expiresAt),
          "Retry-After": String(retryAfter),
        },
      });
    }

    // Increment the count and allow the request.
    current.count++;
    store.set(key, current);
    return null; // Not limited
  };
}