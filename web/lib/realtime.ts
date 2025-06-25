import { redis, publishMailboxEvent } from "./redis"
import { io } from "./websocket"

export class RealtimeService {
  private static instance: RealtimeService
  private subscribers: Map<string, any> = new Map()

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  async subscribeToMailboxEvents(userEmail: string, callback: (event: any) => void) {
    const subscriber = redis.duplicate()
    const channel = `mailbox:events:${userEmail}`

    await subscriber.subscribe(channel)
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        const event = JSON.parse(message)
        callback(event)
      }
    })

    this.subscribers.set(userEmail, subscriber)
    return subscriber
  }

  async unsubscribeFromMailboxEvents(userEmail: string) {
    const subscriber = this.subscribers.get(userEmail)
    if (subscriber) {
      await subscriber.unsubscribe()
      await subscriber.quit()
      this.subscribers.delete(userEmail)
    }
  }

  async publishNewMailEvent(recipientEmail: string, messageData: any) {
    await publishMailboxEvent(recipientEmail, {
      type: "new_mail",
      mailbox: recipientEmail,
      messageId: messageData.message_id,
      subject: messageData.subject,
      from: messageData.from,
      date: messageData.created_at,
      read: false,
      starred: false,
      folder: messageData.folder,
    })

    // Also emit via WebSocket if connected
    if (io) {
      io.to(`user:${recipientEmail}`).emit("new_mail", {
        type: "new_mail",
        message: messageData,
      })
    }
  }

  async publishMessageReadEvent(userEmail: string, messageId: string) {
    await publishMailboxEvent(userEmail, {
      type: "message_read",
      messageId,
      timestamp: new Date(),
    })

    if (io) {
      io.to(`user:${userEmail}`).emit("message_read", {
        messageId,
        timestamp: new Date(),
      })
    }
  }

  async publishMessageDeletedEvent(userEmail: string, messageId: string) {
    await publishMailboxEvent(userEmail, {
      type: "message_deleted",
      messageId,
      timestamp: new Date(),
    })

    if (io) {
      io.to(`user:${userEmail}`).emit("message_deleted", {
        messageId,
        timestamp: new Date(),
      })
    }
  }

  async publishSystemMaintenanceEvent(message: string, scheduledTime?: Date) {
    const event = {
      type: "system_maintenance",
      message,
      scheduledTime,
      timestamp: new Date(),
    }

    await redis.publish("system:events", JSON.stringify(event))

    if (io) {
      io.emit("system_maintenance", event)
    }
  }

  
}

export const realtimeService = RealtimeService.getInstance()
