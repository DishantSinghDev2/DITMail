import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { SessionUser } from "@/types"

import { connectDB } from "@/lib/db"
import Organization from "@/models/Organization"
import User from "@/models/User"
import Domain from "@/models/Domain"
// The Plan model is indirectly used via population, so it must be imported to register the schema with Mongoose.
import "@/models/Plan"


export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the user and get their organization ID from the session
    const session = await getServerSession(authOptions)
    const user = session?.user as SessionUser | undefined

    if (!user || !user.org_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // 2. Fetch all necessary data in parallel for efficiency
    const [orgData, currentUserCount, verifiedDomains] = await Promise.all([
      // Fetch the organization and populate its plan details
      Organization.findById(user.org_id).populate<{ plan_id: import("@/models/Plan").IPlan }>("plan_id"),

      // Count the number of users in the organization (exclude ditmail.online emails)
      User.countDocuments({
        org_id: user.org_id,
        email: { $not: /@ditmail\.online$/i },
      }),

      // Find all domains that have been successfully verified
      Domain.find({ org_id: user.org_id, ownership_verified: true }).select("domain"),
    ])


    // 3. Validate that the organization and its plan exist
    if (!orgData) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }
    if (!orgData.plan_id) {
      return NextResponse.json({ error: "Organization plan details are missing" }, { status: 500 })
    }

    // 4. Construct the response payload in the format expected by the frontend
    const responsePayload = {
      userLimit: orgData.plan_id.limits.users,
      currentUserCount: currentUserCount,
      verifiedDomains: verifiedDomains.map(d => d.domain),
    }

    return NextResponse.json(responsePayload)

  } catch (error) {
    console.error("Error fetching organization details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}