import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import {connectDB} from "@/lib/db"
import User from "@/models/User"
import Organization from "@/models/Organization"
import Plan from "@/models/Plan"
import jwt from "jsonwebtoken"

const INTERNAL_SECRET = process.env.INTERNAL_JWT_SECRET as string
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",")

/**
 * Utility: Check request origin for domain restriction
 */
function isAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!origin) return false
  return ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed))
}

/**
 * Utility: Verify internal platform JWT
 */
function verifyInternalJWT(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.split(" ")[1]
  try {
    return jwt.verify(token, INTERNAL_SECRET)
  } catch (err) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Step 1: Enforce domain restriction
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden - Invalid origin" }, { status: 403 })
    }

    // ✅ Step 2: Verify internal JWT (for internal platforms only)
    const internalClaims = verifyInternalJWT(request)
    if (!internalClaims) {
      return NextResponse.json({ error: "Forbidden - Invalid internal token" }, { status: 403 })
    }

    // ✅ Step 3: Ensure user is authenticated via NextAuth
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      // Joining existing org
      organization = await Organization.findById(orgId)
      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 })
      }
    } else {
      // Create new organization if not provided
      const freePlan = await Plan.findOne({ name: "Free" })
      if (!freePlan) {
        const newFreePlan = new Plan({
          name: "Free",
          limits: { users: 1, domains: 1, storage: 1 },
          price: 0,
          customizable: false,
          features: ["Basic Email", "1 Domain", "1 User"],
        })
        await newFreePlan.save()

        organization = new Organization({
          name: orgName || `${name.split(" ")[0]}'s Organization`,
          plan_id: newFreePlan._id,
        })
      } else {
        organization = new Organization({
          name: orgName || `${name.split(" ")[0]}'s Organization`,
          plan_id: freePlan._id,
        })
      }

      await organization.save()
      userRole = "owner"
    }

    const user = new User({
      name,
      email,
      mailboxAccess: false,
      password_hash: password, // hashed in pre-save hook
      org_id: organization._id,
      role: userRole,
      onboarding: {
        completed: false,
        startedAt: new Date(),
      },
    })

    await user.save()

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
      redirectTo: "/onboarding",
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
