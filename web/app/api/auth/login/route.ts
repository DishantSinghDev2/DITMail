import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import { generateTokens } from "@/lib/auth"
import "@/models/Organization" // ✅ Just import it — even if you don't use it directly


export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { email, password } = await request.json()

    const user = await User.findOne({ email }).populate("org_id")
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValid = await user.comparePassword(password)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      orgId: user.org_id._id.toString(),
      role: user.role,
    })

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        org_id: user.org_id,
        onboarding: user.onboarding,
      },
      ...tokens,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
