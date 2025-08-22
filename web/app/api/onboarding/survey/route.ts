import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {connectDB} from "@/lib/db"
import User from "@/models/User"
import { SessionUser } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;
    
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const surveyData = await request.json()

    // Save survey data to user profile
    await User.findByIdAndUpdate(user.id, {
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
