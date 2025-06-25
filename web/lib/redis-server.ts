import { Redis } from "ioredis"

// Server-side Redis client (not for Edge Runtime)
let redis: Redis | null = null

export function getRedisClient() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")
  }
  return redis
}

export const publishMailboxEvent = async (destination: string, event: any) => {
  try {
    const client = getRedisClient()
    await client.publish(`mailbox:events:${destination}`, JSON.stringify(event))
  } catch (error) {
    console.error("Redis publish error:", error)
  }
}

export { redis }
