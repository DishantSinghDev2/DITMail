import { Redis } from "ioredis"

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")

export const publishMailboxEvent = async (destination: string, event: any) => {
  await redis.publish(`mailbox:events:${destination}`, JSON.stringify(event))
}

export { redis }
