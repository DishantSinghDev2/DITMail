import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import User from "@/models/User"
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { logAuditEvent } from "@/lib/audit"
import { SessionUser } from "@/types";

export async function PUT(request: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    await connectDB()

    
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Check if user has admin permissions
    if (!["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
    }

    // Check if user belongs to this organization
    if (params.id !== user.org_id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    if (!["user", "admin", "owner"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }

    const userDB = await User.findById(params.userId)
    if (!userDB) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (userDB.organizationId.toString() !== params.id) {
      return NextResponse.json({ message: "User not in organization" }, { status: 400 })
    }

    // Update user role
    const updatedUser = await User.findByIdAndUpdate(
      params.userId,
      { role, updatedAt: new Date() },
      { new: true },
    ).select("-password -refreshToken")

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      org_id: user.org_id,
      action: "user.role_updated",
      resource_type: "user",
      resource_id: params.userId,
      details: { newRole: role, previousRole: user.role },
      ip: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user role:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    await connectDB()

    
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Check if user has admin permissions
    if (!["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
    }

    // Check if user belongs to this organization
    if (params.id !== user.org_id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Can't remove yourself
    if (params.userId === user.id) {
      return NextResponse.json({ message: "Cannot remove yourself" }, { status: 400 })
    }

    const userDB = await User.findById(params.userId)
    if (!userDB) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (userDB.organizationId.toString() !== params.id) {
      return NextResponse.json({ message: "User not in organization" }, { status: 400 })
    }

    // Remove user from organization
    await User.findByIdAndUpdate(params.userId, {
      organizationId: null,
      status: "inactive",
      updatedAt: new Date(),
    })

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      org_id: user.org_id,
      action: "user.removed_from_organization",
      resource_type: "user",
      resource_id: params.userId,
      details: { removedUser: user.email },
      ip: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({ message: "User removed successfully" })
  } catch (error) {
    console.error("Error removing user:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
