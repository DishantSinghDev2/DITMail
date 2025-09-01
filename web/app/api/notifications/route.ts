import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // Ensure this path is correct
import { SessionUser } from "@/types";
import { notificationService } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notifications = await notificationService.getUserNotifications(user.id)
    const unreadCount = await notificationService.getUnreadCount(user.id)

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

    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type, title, message, data, expires_at } = await request.json()

    const notification = await notificationService.createNotification(user.id, {
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
