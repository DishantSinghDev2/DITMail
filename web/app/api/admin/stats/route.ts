import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import Domain from "@/models/Domain"
import Message from "@/models/Message"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const [users, domains, verifiedDomains, messagesThisMonth] = await Promise.all([
      User.countDocuments({ org_id: user.org_id }),
      Domain.countDocuments({ org_id: user.org_id }),
      Domain.countDocuments({ org_id: user.org_id, status: "verified" }),
      Message.countDocuments({
        org_id: user.org_id,
        created_at: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ])

    return NextResponse.json({
      stats: {
        users,
        domains,
        verifiedDomains,
        messagesThisMonth,
      },
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
