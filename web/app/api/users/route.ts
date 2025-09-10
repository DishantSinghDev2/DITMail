import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import User from "@/models/User"
import Organization from "@/models/Organization"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { SessionUser } from "@/types"
import { logAuditEvent } from "@/lib/audit"
import Domain from "@/models/Domain"
import jwt from "jsonwebtoken" // <-- Import JWT library

// --- Environment variables for the internal sync ---
const WYI_SYNC_URL = process.env.WHATS_YOUR_INFO_SYNC_URL // e.g., https://whatsyour.info/api/internal/sync-user
const INTERNAL_SECRET = process.env.INTERNAL_JWT_SECRET   // <-- The SAME secret used in WhatsYour.Info

// Helper function to sync user to WhatsYour.Info
async function syncUserToWhatsYourInfo(userData: {
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  username: string
}) {
  if (!WYI_SYNC_URL || !INTERNAL_SECRET) {
    console.warn("Skipping WhatsYour.Info sync: URL or secret not configured.");
    return;
  }

  try {
    // Create a short-lived token for this specific operation
    const token = jwt.sign(userData, INTERNAL_SECRET, { expiresIn: '60s' });

    const response = await fetch(WYI_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      // The body is empty because the data is in the JWT payload
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to sync user ${userData.email}. Status: ${response.status}. Details: ${JSON.stringify(errorData)}`);
    }

    console.log(`Successfully synced user ${userData.email} to WhatsYour.Info.`);

  } catch (error) {
    // Log the error but do not throw it, to avoid failing the main user creation process
    console.error("Error during WhatsYour.Info user sync:", error);
  }
}


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    // Use the standard, secure way to get the session.
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const search = searchParams.get("search") || ""

    const query: { org_id: any; _id?: { $ne: any }; $or?: Array<{ name?: { $regex: string; $options: string }; email?: { $regex: string; $options: string } }> } = { org_id: user.org_id, _id: { $ne: user.id } }
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    const users = await User.find(query)
      .select("-password_hash")
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("org_id", "name")

    const total = await User.countDocuments(query)

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;


    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { firstName, lastName, email, password, role } = await request.json()

    const name = `${firstName} ${lastName}`.trim()

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Check organization limits
    try {
      const org = await Organization.findById(user.org_id).populate("plan_id");
      if (!org || !org.plan_id || !org.plan_id.limits?.users) {
        return NextResponse.json({ error: "Invalid organization or plan data" }, { status: 400 });
      }

      const domains = await Domain.find({ org_id: user.org_id, ownership_verified: true }).distinct("domain");
      const orgDomains = domains.map(domain => domain.split('.').slice(-2).join('.'));

      if (orgDomains.length === 0) {
        return NextResponse.json({ error: "No verified domains found for your organization" }, { status: 400 });
      }

      const userCount = await User.countDocuments({
        org_id: user.org_id,
        email: { $not: /@ditmail\.online$/i },
      });

      if (userCount >= org.plan_id.limits.users) {
        return NextResponse.json({ error: "User limit reached for your plan" }, { status: 400 });
      }
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }

    const newUser = new User({
      name,
      email,
      mailboxAccess: true,
      password_hash: password,
      org_id: user.org_id,
      role: role || "user",
    })

    await newUser.save()

    await syncUserToWhatsYourInfo({
      email: newUser.email,
      password: password, // Send the plain-text password for WYI to hash
      firstName,
      lastName,
      username: email.split('@')[0], // Derive a default username
    });

    await logAuditEvent({
      user_id: user.id,
      action: "user_created",
      details: { created_user_id: newUser.id, email: newUser.email },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({
      user: {
        id: newUser.id,
        name: newUser.name,
        mailboxAccess: newUser.mailboxAccess,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.created_at,
      },
    })
  } catch (error) {
    console.error("User creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
