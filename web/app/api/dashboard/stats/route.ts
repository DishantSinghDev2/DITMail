import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.organizationId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const organizationId = session.user.organizationId

    // Get stats for the organization
    const [emailCount, userCount, storageUsed] = await Promise.all([
      // Count emails for all email accounts in the organization
      prisma.email.count({
        where: {
          folder: {
            emailAccount: {
              organizationId,
            },
          },
        },
      }),
      // Count users in the organization
      prisma.user.count({
        where: {
          organizationId,
          isActive: true,
        },
      }),
      // Calculate storage used (sum of email sizes)
      prisma.email.aggregate({
        where: {
          folder: {
            emailAccount: {
              organizationId,
            },
          },
        },
        _sum: {
          size: true,
        },
      }),
    ])

    // Convert bytes to GB
    const storageInGB = (storageUsed._sum.size || 0) / (1024 * 1024 * 1024)

    return NextResponse.json({
      totalEmails: emailCount,
      totalUsers: userCount,
      storageUsed: `${storageInGB.toFixed(2)} GB`,
      uptime: "99.9%", // This would come from monitoring service
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
