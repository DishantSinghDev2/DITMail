import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route"; // Ensure this path is correct
import { SessionUser } from "@/types";
import { notificationService } from "@/lib/notifications"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {

    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await notificationService.markNotificationAsRead(user.id, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
