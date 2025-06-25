import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"

export async function POST(request: NextRequest) {
  // Only allow localhost connections
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "127.0.0.1"

  if (ip !== "127.0.0.1" && ip !== "::1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await connectDB()

    const { username, password } = await request.json()

    const user = await User.findOne({ email: username })
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const isValid = await user.comparePassword(password)
    if (!isValid) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        org_id: user.org_id,
      },
    })
  } catch (error) {
    console.error("SMTP Bridge auth error:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
