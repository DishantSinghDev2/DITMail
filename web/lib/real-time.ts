import { getRedisClient, publishMailboxEvent } from "./redis-server"

interface MailboxEvent {
  type: string
  payload: any
}

export async function publishEvent(mailboxId: string, event: MailboxEvent) {
  await publishMailboxEvent(mailboxId, event)
}

export async function subscribeToMailbox(mailboxId: string, callback: (event: MailboxEvent) => void) {
  const redis = getRedisClient()
  const subscriber = redis.duplicate()

  await subscriber.connect()
  await subscriber.subscribe(mailboxId, (message) => {
    const event: MailboxEvent = JSON.parse(message)
    callback(event)
  })

  return async () => {
    await subscriber.unsubscribe(mailboxId)
    await subscriber.quit()
  }
}

export interface RealtimeEvent {
  type: "new_message" | "message_read" | "notification" | "user_status"
  data: any
  timestamp: Date
}

export class RealtimeService {
  private static instance: RealtimeService

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  async publishNewMailEvent(userId: string, event: RealtimeEvent) {
    try {
      const redis = getRedisClient()
      await redis.publish(
        `user:${userId}:events`,
        JSON.stringify({
          ...event,
          timestamp: new Date(),
        }),
      )
    } catch (error) {
      console.error("Error publishing realtime event:", error)
    }
  }

  async publishGlobalEvent(event: RealtimeEvent) {
    try {
      const redis = getRedisClient()
      await redis.publish(
        "global:events",
        JSON.stringify({
          ...event,
          timestamp: new Date(),
        }),
      )
    } catch (error) {
      console.error("Error publishing global event:", error)
    }
  }

  async subscribeToUserEvents(userId: string, callback: (event: RealtimeEvent) => void) {
    try {
      const redis = getRedisClient()
      await redis.subscribe(`user:${userId}:events`)

      redis.on("message", (channel, message) => {
        if (channel === `user:${userId}:events`) {
          try {
            const event = JSON.parse(message)
            callback(event)
          } catch (error) {
            console.error("Error parsing realtime event:", error)
          }
        }
      })
    } catch (error) {
      console.error("Error subscribing to user events:", error)
    }
  }
}

export const realtimeService = RealtimeService.getInstance()
