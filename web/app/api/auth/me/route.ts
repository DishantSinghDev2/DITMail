import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import "@/models/Organization" // ✅ Just import it — even if you don't use it directly

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        org_id: user.org_id,
        onboarding: user.onboarding,
      },
    })
  } catch (error) {
    console.error("Auth me error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
