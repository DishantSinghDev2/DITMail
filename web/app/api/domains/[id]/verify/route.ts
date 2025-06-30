import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Domain from "@/models/Domain"
import { getAuthUser } from "@/lib/auth"
import { verifyDNSRecords } from "@/lib/dns"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const domain = await Domain.findOne({ _id: params.id, org_id: user.org_id })
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const verification = await verifyDNSRecords(domain.domain, domain.verification_code)

    const updates = {
      mx_verified: verification.mx,
      spf_verified: verification.spf,
      dkim_verified: verification.dkim,
      dmarc_verified: verification.dmarc,
      ownership_verified: verification.ownershipVerified,
      status: verification.mx && verification.spf && verification.dkim && verification.dmarc ? "verified" : "pending",
    }

    const updatedDomain = await Domain.findByIdAndUpdate(params.id, updates, { new: true })

    await logAuditEvent({
      user_id: user._id,
      action: "domain_verification_check",
      details: { domain: domain.domain, verification },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({
      domain: updatedDomain,
      verification,
    })
  } catch (error) {
    console.error("Domain verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
