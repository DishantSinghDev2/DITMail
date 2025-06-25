import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Organization from "@/models/Organization"
import { verifyToken } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const organization = await Organization.findById(params.id)
    if (!organization) {
      return NextResponse.json({ message: "Organization not found" }, { status: 404 })
    }

    // Check if user belongs to this organization
    if (organization._id.toString() !== decoded.organizationId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error("Error fetching organization:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const body = await request.json()
    const { name, description, settings } = body

    const organization = await Organization.findById(params.id)
    if (!organization) {
      return NextResponse.json({ message: "Organization not found" }, { status: 404 })
    }

    // Check if user belongs to this organization
    if (organization._id.toString() !== decoded.organizationId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Update organization
    const updatedOrganization = await Organization.findByIdAndUpdate(
      params.id,
      {
        name,
        description,
        settings: {
          ...organization.settings,
          ...settings,
        },
        updatedAt: new Date(),
      },
      { new: true },
    )

    // Log audit event
    await logAuditEvent({
      user_id: decoded.userId,
      org_id: decoded.organizationId,
      action: "organization.updated",
      resource: "organization",
      resourceId: params.id,
      details: { name, description, settings },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json(updatedOrganization)
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
