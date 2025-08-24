import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import AuditLog from "@/models/AuditLog"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    await connectDB()

    // Build query
    const query: any = {}

    if (action) {
      query.action = action
    }

    if (userId) {
      query.user_id = userId
    }

    if (startDate || endDate) {
      query.created_at = {}
      if (startDate) {
        query.created_at.$gte = new Date(startDate)
      }
      if (endDate) {
        query.created_at.$lte = new Date(endDate)
      }
    }

    // Get activities with user information
    const activities = await AuditLog.aggregate([
      { $match: query },
      { $sort: { created_at: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $addFields: {
          user_name: { $arrayElemAt: ["$user.name", 0] },
          user_email: { $arrayElemAt: ["$user.email", 0] },
        },
      },
      {
        $project: {
          user: 0, // Remove the full user object
        },
      },
    ])

    const total = await AuditLog.countDocuments(query)

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Activity fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
