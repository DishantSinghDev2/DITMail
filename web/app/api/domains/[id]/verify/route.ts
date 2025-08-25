import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Domain from "@/models/Domain"
import { verifyDNSRecords } from "@/lib/dns"
import { logAuditEvent } from "@/lib/audit"
import { getServerSession } from "next-auth";
import { SessionUser } from "@/types";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidateTag } from "next/cache"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const domain = await Domain.findOne({ _id: params.id, org_id: user.org_id });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found or access denied" }, { status: 404 });
    }

    // Perform the live DNS lookup
    const verification = await verifyDNSRecords(domain.domain, domain.verification_code);

    const isFullyVerified = verification.txt && verification.mx && verification.spf && verification.dkim && verification.dmarc;

    const updates = {
      ownership_verified: verification.txt,
      mx_verified: verification.mx,
      spf_verified: verification.spf,
      dkim_verified: verification.dkim,
      dmarc_verified: verification.dmarc,
      status: isFullyVerified ? "verified" : "pending",
      last_checked: new Date(),
    };

    const updatedDomain = await Domain.findByIdAndUpdate(params.id, updates, { new: true });

    // Log the verification attempt
    await logAuditEvent({
      user_id: user.id,
      action: "domain_verification_check",
      details: { domain: domain.domain, verificationStatus: verification },
      ip: request.headers.get("x-forwarded-for") || request.ip || "unknown",
    });

    revalidateTag(`org:${user.org_id}:domains`);

    return NextResponse.json({
      domain: updatedDomain,
      verification,
    });
  } catch (error) {
    console.error("Domain verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}