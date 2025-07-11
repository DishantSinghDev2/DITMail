import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Message from "@/models/Message"
import Alias from "@/models/Alias"
import Domain from "@/models/Domain"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Get domain
    const domain = await Domain.findById(params.id)
    if (!domain) {
      return NextResponse.json({ message: "Domain not found" }, { status: 404 })
    }

    // Check if user belongs to the same organization as the domain
    if (domain.organizationId.toString() !== decoded.organizationId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Get domain stats
    const [totalEmails, totalAliases, storageStats, lastActivity] = await Promise.all([
      // Count total emails for this domain
      Message.countDocuments({
        $or: [
          { "from.address": { $regex: `@${domain.domain}$`, $options: "i" } },
          { "to.address": { $regex: `@${domain.domain}$`, $options: "i" } },
        ],
      }),

      // Count aliases for this domain
      Alias.countDocuments({
        domain: domain.domain,
        organizationId: decoded.organizationId,
      }),

      // Calculate storage used
      Message.aggregate([
        {
          $match: {
            $or: [
              { "from.address": { $regex: `@${domain.domain}$`, $options: "i" } },
              { "to.address": { $regex: `@${domain.domain}$`, $options: "i" } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalSize: { $sum: "$size" },
          },
        },
      ]),

      // Get last activity
      Message.findOne({
        $or: [
          { "from.address": { $regex: `@${domain.domain}$`, $options: "i" } },
          { "to.address": { $regex: `@${domain.domain}$`, $options: "i" } },
        ],
      })
        .sort({ createdAt: -1 })
        .select("createdAt"),
    ])

    const storageUsed = storageStats.length > 0 ? storageStats[0].totalSize : 0

    return NextResponse.json({
      totalEmails,
      totalAliases,
      storageUsed,
      lastActivity: lastActivity?.createdAt || null,
    })
  } catch (error) {
    console.error("Error fetching domain stats:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
