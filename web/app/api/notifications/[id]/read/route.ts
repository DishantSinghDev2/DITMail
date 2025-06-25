import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { notificationService } from "@/lib/notifications"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await notificationService.markNotificationAsRead(decoded.userId, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
