import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { notificationService } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

    const notifications = await notificationService.getUserNotifications(user._id)
    const unreadCount = await notificationService.getUnreadCount(user._id)

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

    const { type, title, message, data, expires_at } = await request.json()

    const notification = await notificationService.createNotification(user._id, {
      type,
      title,
      message,
      data,
      expires_at: expires_at ? new Date(expires_at) : undefined,
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
