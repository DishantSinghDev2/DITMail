import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import Organization from "@/models/Organization"
import { verifyToken } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"
import { sendEmail } from "@/lib/smtp"
import crypto from "crypto"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json({ message: "Email and role are required" }, { status: 400 })
    }

    if (!["user", "admin"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    // Get organization details
    const organization = await Organization.findById(params.id)
    if (!organization) {
      return NextResponse.json({ message: "Organization not found" }, { status: 404 })
    }

    // Check user limit
    const userCount = await User.countDocuments({ organizationId: params.id })
    if (userCount >= (organization.settings?.maxUsersPerOrg || 100)) {
      return NextResponse.json({ message: "User limit reached" }, { status: 400 })
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex")
    const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create pending user
    const newUser = new User({
      email,
      firstName: "",
      lastName: "",
      password: "", // Will be set when user accepts invitation
      role,
      organizationId: params.id,
      status: "pending",
      invitationToken,
      invitationExpires,
      createdAt: new Date(),
    })

    await newUser.save()

    // Send invitation email
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationToken}`

    await sendEmail({
      to: email,
      subject: `Invitation to join ${organization.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're invited to join ${organization.name}</h2>
          <p>You have been invited to join the ${organization.name} organization on DITMail.</p>
          <p>Click the link below to accept your invitation and set up your account:</p>
          <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Accept Invitation
          </a>
          <p>This invitation will expire in 7 days.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    })

    // Log audit event
    await logAuditEvent({
      user_id: decoded.userId,
      org_id: decoded.organizationId,
      action: "user.invited",
      resource_type: "user",
      resource_id: newUser._id.toString(),
      details: { invitedEmail: email, role },
      ip: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    return NextResponse.json({
      message: "Invitation sent successfully",
      userId: newUser._id,
    })
  } catch (error) {
    console.error("Error sending invitation:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
