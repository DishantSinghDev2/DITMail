import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import Organization from "@/models/Organization"
import { getAuthUser } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const search = searchParams.get("search") || ""

    const query: { org_id: any; $or?: Array<{ name?: { $regex: string; $options: string }; email?: { $regex: string; $options: string } }> } = { org_id: user.org_id }
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    const users = await User.find(query)
      .select("-password_hash")
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("org_id", "name")

    const total = await User.countDocuments(query)

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, email, password, role } = await request.json()

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Check organization limits
    const org = await Organization.findById(user.org_id).populate("plan_id")
    const userCount = await User.countDocuments({ org_id: user.org_id })

    if (userCount >= org.plan_id.limits.users) {
      return NextResponse.json({ error: "User limit reached for your plan" }, { status: 400 })
    }

    const newUser = new User({
      name,
      email,
      password_hash: password,
      org_id: user.org_id,
      role: role || "user",
    })

    await newUser.save()

    await logAuditEvent({
      user_id: user._id,
      action: "user_created",
      details: { created_user_id: newUser._id, email: newUser.email },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.created_at,
      },
    })
  } catch (error) {
    console.error("User creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
