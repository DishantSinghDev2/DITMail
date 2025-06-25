import { realtimeService } from "./realtime"
import { redis } from "./redis"

export interface Notification {
  id: string
  type: "email" | "system" | "security" | "plan"
  title: string
  message: string
  data?: any
  read: boolean
  created_at: Date
  expires_at?: Date
}

export class NotificationService {
  private static instance: NotificationService

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async createNotification(userId: string, notification: Omit<Notification, "id" | "read" | "created_at">) {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const fullNotification: Notification = {
      id: notificationId,
      read: false,
      created_at: new Date(),
      ...notification,
    }

    // Store in Redis with expiration (30 days default)
    const expirationSeconds = notification.expires_at
      ? Math.floor((notification.expires_at.getTime() - Date.now()) / 1000)
      : 30 * 24 * 60 * 60

    await redis.setex(`notification:${userId}:${notificationId}`, expirationSeconds, JSON.stringify(fullNotification))

    // Add to user's notification list
    await redis.lpush(`notifications:${userId}`, notificationId)
    await redis.expire(`notifications:${userId}`, expirationSeconds)

    // Send real-time notification
    await realtimeService.publishNewMailEvent(userId, {
      type: "notification",
      notification: fullNotification,
    })

    return fullNotification
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const notificationIds = await redis.lrange(`notifications:${userId}`, 0, limit - 1)
    const notifications: Notification[] = []

    for (const id of notificationIds) {
      const notificationData = await redis.get(`notification:${userId}:${id}`)
      if (notificationData) {
        notifications.push(JSON.parse(notificationData))
      }
    }

    return notifications.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    const notificationData = await redis.get(`notification:${userId}:${notificationId}`)
    if (notificationData) {
      const notification = JSON.parse(notificationData)
      notification.read = true

      await redis.set(`notification:${userId}:${notificationId}`, JSON.stringify(notification), "KEEPTTL")
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.getUserNotifications(userId)
    return notifications.filter((n) => !n.read).length
  }

  // Predefined notification types
  async notifyNewEmail(userId: string, emailData: any) {
    await this.createNotification(userId, {
      type: "email",
      title: "New Email",
      message: `New email from ${emailData.from}: ${emailData.subject}`,
      data: { messageId: emailData.message_id },
    })
  }

  async notifyPlanLimitReached(userId: string, limitType: string, planName: string) {
    await this.createNotification(userId, {
      type: "plan",
      title: "Plan Limit Reached",
      message: `You've reached your ${limitType} limit for the ${planName} plan. Consider upgrading.`,
      data: { limitType, planName },
    })
  }

  async notifySecurityAlert(userId: string, alertType: string, details: any) {
    await this.createNotification(userId, {
      type: "security",
      title: "Security Alert",
      message: `Security alert: ${alertType}`,
      data: details,
    })
  }

  async notifySystemMaintenance(userId: string, maintenanceInfo: any) {
    await this.createNotification(userId, {
      type: "system",
      title: "System Maintenance",
      message: `Scheduled maintenance: ${maintenanceInfo.message}`,
      data: maintenanceInfo,
      expires_at: maintenanceInfo.scheduledTime,
    })
  }
}

export const notificationService = NotificationService.getInstance()
