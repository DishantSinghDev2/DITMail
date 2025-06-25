import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Organization from "@/models/Organization"
import User from "@/models/User"
import Domain from "@/models/Domain"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const org = await Organization.findById(user.org_id).populate("plan_id")
    const userCount = await User.countDocuments({ org_id: user.org_id })
    const domainCount = await Domain.countDocuments({ org_id: user.org_id })

    return NextResponse.json({
      organization: {
        ...org.toObject(),
        stats: {
          users: userCount,
          domains: domainCount,
        },
      },
    })
  } catch (error) {
    console.error("Organization fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "owner") {
      return NextResponse.json({ error: "Only owners can update organization" }, { status: 403 })
    }

    const updates = await request.json()
    await connectDB()

    const org = await Organization.findByIdAndUpdate(user.org_id, updates, { new: true }).populate("plan_id")

    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error("Organization update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
