import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import Organization from "@/models/Organization"
import Plan from "@/models/Plan"
import { generateTokens } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { name, email, password, orgName, joinExisting, orgId } = await request.json()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    let organization
    let userRole = "user"

    if (joinExisting && orgId) {
      organization = await Organization.findById(orgId)
      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 })
      }
    } else {
      // Create new organization
      const freePlan = await Plan.findOne({ name: "Free" })
      if (!freePlan) {
        // Create default free plan
        const newFreePlan = new Plan({
          name: "Free",
          limits: { users: 1, domains: 1, storage: 1 },
          price: 0,
          customizable: false,
          features: ["Basic Email", "1 Domain", "1 User"],
        })
        await newFreePlan.save()
        organization = new Organization({ name: orgName, plan_id: newFreePlan._id })
      } else {
        organization = new Organization({ name: orgName, plan_id: freePlan._id })
      }

      await organization.save()
      userRole = "owner"
    }

    const user = new User({
      name,
      email,
      mailboxAccess: false,
      password_hash: password, // Will be hashed in pre-save hook
      org_id: organization._id,
      role: userRole,
      onboarding: {
        completed: false,
        startedAt: new Date(),
      },
    })

    await user.save()

    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      orgId: organization._id.toString(),
      role: user.role,
    })

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        mailboxAccess: user.mailboxAccess,
        email: user.email,
        role: user.role,
        org_id: user.org_id,
        onboarding: user.onboarding,
      },
      ...tokens,
      redirectTo: "/onboarding", // Redirect to onboarding
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
