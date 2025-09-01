import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route"; // Ensure this path is correct
import { SessionUser } from "@/types";
import { notificationService } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  try {
   
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const count = await notificationService.getUnreadCount(user.id)

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error fetching unread count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
