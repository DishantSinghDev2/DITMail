import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import connectDB from "@/lib/db"
import User from "@/models/User"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await connectDB()

    const surveyData = await request.json()

    // Save survey data to user profile
    await User.findByIdAndUpdate(decoded.userId, {
      $set: {
        "onboarding.survey": surveyData,
        "onboarding.completedAt": new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Survey save error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
