import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import connectDB from "@/lib/db"
import User from "@/models/User"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const surveyData = await request.json()

    // Save survey data to user profile
    await User.findByIdAndUpdate(user._id, {
      $set: {
        "onboarding.survey": surveyData,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Survey save error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
