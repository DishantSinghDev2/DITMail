import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import Domain from "@/models/Domain";
import User from "@/models/User"; // Import the User model
import { connectDB } from "@/lib/db";
import { SessionUser } from "@/types";
import mongoose from "mongoose"; // Import mongoose for ObjectId validation

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid Domain ID" }, { status: 400 });
    }

    const domain = await Domain.findOne({ _id: params.id, org_id: user.org_id });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // --- Directly embed DNS record generation logic ---
    const dnsRecords = {
      // Ownership verification TXT record
      txt: `${domain.domain} IN TXT "ditmail-verification=${domain.verification_code || ''}"`,
      
      // MX record
      mx: `${domain.domain} IN MX 10 mx.ditmail.online.`, // Adjust hostname if your mail server differs
      
      // SPF record
      spf: `${domain.domain} IN TXT "v=spf1 mx include:smtp.ditmail.online -all"`, // Adjust include: if needed
      
      // DKIM record (using 'default' selector as in the example)
      dkim: `default._domainkey.${domain.domain} IN TXT "v=DKIM1; k=rsa; p=${domain.dkim_public_key || ''}"`,
      
      // DMARC record
      dmarc: `_dmarc.${domain.domain} IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@${domain.domain}"`, // Adjust p= policy and rua= as needed
    };

    // Return the domain details along with its dynamically generated DNS records
    return NextResponse.json({ ...domain, dnsRecords });
  } catch (error) {
    console.error("Failed to fetch domain or generate DNS records:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  // 1. Authentication and Authorization
  if (!user || !["owner", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    // 2. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid Domain ID" }, { status: 400 });
    }

    // 3. Find and Delete Domain
    const deletedDomain = await Domain.findOneAndDelete({ _id: params.id, org_id: user.org_id });

    if (!deletedDomain) {
      return NextResponse.json({ error: "Domain not found or not authorized to delete" }, { status: 404 });
    }

    // 4. Handle Associated Users (Crucial step!)
    // Find all users whose emails end with the deleted domain and update them.
    // For simplicity, we will disable their mailboxAccess.
    // In a real application, you might:
    // - Prompt the admin to reassign emails to a new domain.
    // - Set their email to a placeholder like `user.id@deleted.domain`.
    // - Migrate them to a default `@ditmail.online` address.
    const usersToUpdate = await User.find({ 
        email: { $regex: `@${deletedDomain.domain}$`, $options: 'i' },
        org_id: user.org_id 
    });

    if (usersToUpdate.length > 0) {
      console.warn(`Disabling mailbox access for ${usersToUpdate.length} users whose emails were on deleted domain: ${deletedDomain.domain}`);
      await User.updateMany(
        { _id: { $in: usersToUpdate.map(u => u._id) } },
        { $set: { mailboxAccess: false } } // Disable their email access
        // Consider also changing their email to a default ditmail address or flagging them
      );
    }
    
    // 5. Invalidate the cache for this organization's domains
    // This ensures the admin UI reflects the deletion immediately.
    // We assume `revalidateTag` is available from 'next/cache'
    // For Next.js 13.4+, you can use `revalidatePath` or `revalidateTag`
    // const { revalidateTag } = require('next/cache'); // or import from 'next/cache'
    // revalidateTag(`org:${user.org_id}:domains`); // This requires Next.js to provide revalidateTag

    return NextResponse.json({ message: `Domain '${deletedDomain.domain}' deleted successfully.` });
  } catch (error) {
    console.error("Failed to delete domain:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}