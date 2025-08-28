import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Organization from "@/models/Organization"
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { logAuditEvent } from "@/lib/audit"
import { SessionUser } from "@/types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()


    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const organization = await Organization.findById(params.id)
    if (!organization) {
      return NextResponse.json({ message: "Organization not found" }, { status: 404 })
    }

    // Check if user belongs to this organization
    if (organization._id.toString() !== user.org_id) {
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



    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Check if user has admin permissions
    if (!["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, settings } = body

    const organization = await Organization.findById(params.id)
    if (!organization) {
      return NextResponse.json({ message: "Organization not found" }, { status: 404 })
    }

    // Check if user belongs to this organization
    if (organization._id.toString() !== user.org_id) {
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
      user_id: user.id,
      org_id: user.org_id,
      action: "organization.updated",
      resource_type: "organization",
      resource_id: params.id,
      details: { name, description, settings },
      ip: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json(updatedOrganization)
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
