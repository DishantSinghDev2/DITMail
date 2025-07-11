import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Alias from "@/models/Alias"
import Domain from "@/models/Domain"
import { getAuthUser } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get("domainId")

    await connectDB()

    const query: any = { org_id: user.org_id }
    if (domainId) {
      query.domain_id = domainId
    }

    const aliases = await Alias.find(query).populate("domain_id", "domain").sort({ created_at: -1 })

    return NextResponse.json({ aliases })
  } catch (error) {
    console.error("Aliases fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { alias, destination, domainId } = await request.json()

    await connectDB()

    // Verify domain belongs to organization
    const domain = await Domain.findOne({ _id: domainId, org_id: user.org_id, status: "verified" })
    if (!domain) {
      return NextResponse.json({ error: "Domain not found or not verified" }, { status: 404 })
    }

    // Check if alias already exists
    const existingAlias = await Alias.findOne({ alias: `${alias}@${domain.domain}`, domain_id: domainId })
    if (existingAlias) {
      return NextResponse.json({ error: "Alias already exists" }, { status: 400 })
    }

    const newAlias = new Alias({
      alias: `${alias}@${domain.domain}`,
      destination: Array.isArray(destination) ? destination : [destination],
      domain_id: domainId,
      org_id: user.org_id,
    })

    await newAlias.save()

    await logAuditEvent({
      user_id: user._id.toString(),
      action: "alias_created",
      details: { alias: newAlias.alias, destination: newAlias.destination },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ alias: newAlias })
  } catch (error) {
    console.error("Alias creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
