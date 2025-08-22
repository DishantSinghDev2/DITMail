import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import Profile from "@/models/Profile"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { SessionUser } from "@/types"
import { logAuditEvent } from "@/lib/audit"
import { time } from "console"

export async function PATCH(request: NextRequest) {
  try {
     const session = await getServerSession(authOptions);
     const user = session?.user as SessionUser | undefined;
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updates = await request.json()

    await connectDB()

    const targetProfile = await Profile.findOne({ userId: user.id })
    if (!targetProfile) {
      
        // If the profile doesn't exist, create it
      const newProfile = new Profile({
        userId: user.id,
        ...updates, // Spread the updates into the new profile
      })
      await newProfile.save()
      return NextResponse.json({ profile: newProfile })
    }

    // Only owners can modify other owners/admins
    if (targetProfile.role === "owner" && user.role !== "owner") {
      return NextResponse.json({ error: "Cannot modify owner account" }, { status: 403 })
    }

    const updatedProfile = await Profile.findOneAndUpdate({userId: user.id}, updates, { new: true })

    await logAuditEvent({
      user_id: user.id,
      action: "profile_updated",
      details: { updated_user_id: user.id, changes: updates },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}