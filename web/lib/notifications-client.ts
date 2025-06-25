// Client-side notification service (no Redis dependency)
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

export class ClientNotificationService {
  async getUserNotifications(limit = 50): Promise<{ notifications: Notification[]; unreadCount: number }> {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`/api/notifications?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        return await response.json()
      }
      return { notifications: [], unreadCount: 0 }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return { notifications: [], unreadCount: 0 }
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.ok
    } catch (error) {
      console.error("Error marking notification as read:", error)
      return false
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        return data.count
      }
      return 0
    } catch (error) {
      console.error("Error fetching unread count:", error)
      return 0
    }
  }
}

export const clientNotificationService = new ClientNotificationService()
