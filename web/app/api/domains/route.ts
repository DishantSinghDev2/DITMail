import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Domain from "@/models/Domain"
import { getAuthUser } from "@/lib/auth"
import { generateDKIMKeys } from "@/lib/dns"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const domains = await Domain.find({ org_id: user.org_id, ownership_verified: true })

    return NextResponse.json({ domains })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { domain } = await request.json()

    await connectDB()

    // Check if domain already exists
    const existingDomain = await Domain.findOne({ domain, ownership_verified: true, org_id: user.org_id })
    if (existingDomain) {
      return NextResponse.json({ error: "Domain already exists and verified" }, { status: 400 })
    }

    // Generate DKIM keys
    const { publicKey, privateKey } = await generateDKIMKeys()
  
    // Generate a verification code random
    const verificationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    const newDomain = new Domain({
      domain,
      org_id: user.org_id,
      dkim_public_key: publicKey,
      dkim_private_key: privateKey,
      verification_code: verificationCode,
    })

    await newDomain.save()

    return NextResponse.json({
      domain: newDomain,
      dnsRecords: {
        txt: `${domain} IN TXT "ditmail-verification=${verificationCode}"`,
        mx: `${domain} IN MX 10 mx.freecustom.email.`,
        spf: `${domain} IN TXT "v=spf1 mx include:smtp.freecustom.email -all"`,
        dkim: `default._domainkey.${domain} IN TXT "v=DKIM1; k=rsa; p=${publicKey}"`,
        dmarc: `_dmarc.${domain} IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@${domain}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
