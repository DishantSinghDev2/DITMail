import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import AuditLog from "@/models/AuditLog"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const action = searchParams.get("action")

    await connectDB()

    const query: any = {}
    if (action) {
      query.action = action
    }

    const logs = await AuditLog.find(query)
      .populate("user_id", "name email")
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const total = await AuditLog.countDocuments(query)

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Audit logs fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
