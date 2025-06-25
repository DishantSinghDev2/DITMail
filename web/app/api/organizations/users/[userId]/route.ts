import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import { verifyToken } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function PUT(request: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    await connectDB()

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Check if user has admin permissions
    if (!["owner", "admin"].includes(decoded.role)) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
    }

    // Check if user belongs to this organization
    if (params.id !== decoded.organizationId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    if (!["user", "admin", "owner"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }

    const user = await User.findById(params.userId)
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.organizationId.toString() !== params.id) {
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
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      action: "user.role_updated",
      resource: "user",
      resourceId: params.userId,
      details: { newRole: role, previousRole: user.role },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
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

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Check if user has admin permissions
    if (!["owner", "admin"].includes(decoded.role)) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
    }

    // Check if user belongs to this organization
    if (params.id !== decoded.organizationId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Can't remove yourself
    if (params.userId === decoded.userId) {
      return NextResponse.json({ message: "Cannot remove yourself" }, { status: 400 })
    }

    const user = await User.findById(params.userId)
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.organizationId.toString() !== params.id) {
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
      user_id: decoded.userId,
      org_id: decoded.organizationId,
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
