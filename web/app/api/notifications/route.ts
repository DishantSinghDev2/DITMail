import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { notificationService } from "@/lib/notifications"
import { asyncHandler } from "@/lib/error-handler"

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "50")

  const notifications = await notificationService.getUserNotifications(user._id.toString(), limit)
  const unreadCount = await notificationService.getUnreadCount(user._id.toString())

  return NextResponse.json({ notifications, unreadCount })
})
