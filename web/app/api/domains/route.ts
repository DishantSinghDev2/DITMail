import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Domain from "@/models/Domain"
import { getServerSession } from "next-auth";
import { SessionUser } from "@/types";
import { generateDKIMKeys } from "@/lib/dns"
import Organization from "@/models/Organization"
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    // Use the standard, secure way to get the session.
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB()
    const domain = await Domain.findOne({ org_id: user.org_id, verification_code: { $exists: true } })

    return NextResponse.json({
      domain: domain || null,
      dnsRecords: domain ? {
        txt: `${domain.domain} IN TXT "ditmail-verification=${domain.verification_code}"`,
        mx: `${domain.domain} IN MX 10 mx.ditmail.online.`,
        spf: `${domain.domain} IN TXT "v=spf1 mx include:smtp.ditmail.online -all"`,
        dkim: `default._domainkey.${domain.domain} IN TXT "v=DKIM1; k=rsa; p=${domain.dkim_public_key}"`,
        dmarc: `_dmarc.${domain.domain} IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@${domain.domain}"`,
      } : null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    // Use the standard, secure way to get the session.
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domain } = await request.json()

    const validity = isValidDomain(domain)

    if (!validity.allowed) {
      return NextResponse.json({ error: `Domain extention ${validity.tld} isn't allowed to be used with DITMail` }, { status: 422 })
    }

    await connectDB()

    // Check if domain already exists
    const existingDomain = await Domain.findOne({ domain, ownership_verified: true })
    if (existingDomain) {
      return NextResponse.json({ error: "Domain already exists and verified" }, { status: 400 })
    }

    // Check organization limits
    const org = await Organization.findById(user.org_id).populate("plan_id")
    const domainCount = await Domain.countDocuments({ org_id: user.org_id, ownership_verified: true })

    if (domainCount >= org.plan_id.limits.domains) {
      return NextResponse.json({ error: "Domain limit reached for your plan" }, { status: 400 })
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
        mx: `${domain} IN MX 10 mx.ditmail.online.`,
        spf: `${domain} IN TXT "v=spf1 mx include:smtp.ditmail.online -all"`,
        dkim: `default._domainkey.${domain} IN TXT "v=DKIM1; k=rsa; p=${publicKey}"`,
        dmarc: `_dmarc.${domain} IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@${domain}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const blacklistedTLDs = [
  "tk", "ml", "ga", "cf", "gq", // Freenom free domains
  "gg", "ru", "cn", "cam", "men", "mom" // sometimes flagged too
];

function isValidDomain(domain: string): { allowed: boolean, tld: string } {
  // Extract TLD
  const tld = domain.split('.').pop()?.toLowerCase() || '';

  if (blacklistedTLDs.includes(tld)) return {
    allowed: false,
    tld
  };

  return {
    allowed: true,
    tld
  };
}