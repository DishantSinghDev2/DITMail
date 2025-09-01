// Server-side notification service (with Redis)
import { getRedisClient } from "./redis-server"

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
    try {
      const redis = getRedisClient()
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

      return fullNotification
    } catch (error) {
      console.error("Error creating notification:", error)
      return null
    }
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    try {
      const redis = getRedisClient()
      const notificationIds = await redis.lrange(`notifications:${userId}`, 0, limit - 1)
      const notifications: Notification[] = []

      for (const id of notificationIds) {
        const notificationData = await redis.get(`notification:${userId}:${id}`)
        if (notificationData) {
          notifications.push(JSON.parse(notificationData))
        }
      }

      return notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return []
    }
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    try {
      const redis = getRedisClient()
      const notificationData = await redis.get(`notification:${userId}:${notificationId}`)
      if (notificationData) {
        const notification = JSON.parse(notificationData)
        notification.read = true

        await redis.set(`notification:${userId}:${notificationId}`, JSON.stringify(notification), "KEEPTTL")
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userId)
      return notifications.filter((n) => !n.read).length
    } catch (error) {
      console.error("Error getting unread count:", error)
      return 0
    }
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
