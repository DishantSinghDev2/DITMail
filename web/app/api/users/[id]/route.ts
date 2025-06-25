import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import { getAuthUser } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updates = await request.json()
    delete updates.password_hash // Prevent direct password updates

    await connectDB()

    const targetUser = await User.findOne({ _id: params.id, org_id: user.org_id })
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only owners can modify other owners/admins
    if (targetUser.role === "owner" && user.role !== "owner") {
      return NextResponse.json({ error: "Cannot modify owner account" }, { status: 403 })
    }

    const updatedUser = await User.findByIdAndUpdate(params.id, updates, { new: true }).select("-password_hash")

    await logAuditEvent({
      user_id: user._id,
      action: "user_updated",
      details: { updated_user_id: params.id, changes: updates },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "owner") {
      return NextResponse.json({ error: "Only owners can delete users" }, { status: 403 })
    }

    await connectDB()

    const targetUser = await User.findOne({ _id: params.id, org_id: user.org_id })
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (targetUser.role === "owner") {
      return NextResponse.json({ error: "Cannot delete owner account" }, { status: 403 })
    }

    await User.findByIdAndDelete(params.id)

    await logAuditEvent({
      user_id: user._id,
      action: "user_deleted",
      details: { deleted_user_id: params.id, email: targetUser.email },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("User deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
