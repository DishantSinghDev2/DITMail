import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Message from "@/models/Message"
import Contact from "@/models/Contact"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { SessionUser } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    await connectDB()

    let contacts = []

    if (query) {
      // Search contacts by name or email
      contacts = await Contact.find({
        user_id: user.id,
        $or: [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
      })
        .sort({ last_contacted: -1 })
        .limit(limit)
    } else {
      // Get recent contacts from message history
      const recentContacts = await Message.aggregate([
        {
          $match: {
            user_id: user.id,
            $or: [{ status: "sent" }, { status: "received" }],
          },
        },
        {
          $project: {
            emails: {
              $concatArrays: [
                [{ email: "$from", name: "$from_name", type: "from" }],
                {
                  $map: {
                    input: "$to",
                    as: "email",
                    in: { email: "$$email", name: null, type: "to" },
                  },
                },
                {
                  $map: {
                    input: { $ifNull: ["$cc", []] },
                    as: "email",
                    in: { email: "$$email", name: null, type: "cc" },
                  },
                },
              ],
            },
            created_at: 1,
          },
        },
        { $unwind: "$emails" },
        {
          $match: {
            "emails.email": { $ne: user.email, $regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, // Exclude self
          },
        },
        {
          $group: {
            _id: "$emails.email",
            name: { $first: "$emails.name" },
            lastContact: { $max: "$created_at" },
            count: { $sum: 1 },
            type: { $first: "$emails.type" },
          },
        },
        { $sort: { lastContact: -1 } },
        { $limit: limit },
        {
          $project: {
            email: "$_id",
            name: { $ifNull: ["$name", "$_id"] },
            lastContact: 1,
            count: 1,
            type: 1,
          },
        },
      ])

      // Merge with saved contacts
      const savedContacts = await Contact.find({
        user_id: user.id,
      })
        .sort({ last_contacted: -1 })
        .limit(limit)

      // Combine and deduplicate
      const contactMap = new Map()

      // Add recent contacts
      recentContacts.forEach((contact) => {
        contactMap.set(contact.email, {
          email: contact.email,
          name: contact.name,
          lastContact: contact.lastContact,
          count: contact.count,
          source: "recent",
        })
      })

      // Add/update with saved contacts
      savedContacts.forEach((contact) => {
        const existing = contactMap.get(contact.email)
        contactMap.set(contact.email, {
          email: contact.email,
          name: contact.name,
          lastContact: existing?.lastContact || contact.last_contacted,
          count: existing?.count || 0,
          source: "saved",
          phone: contact.phone,
          organization: contact.organization,
        })
      })

      contacts = Array.from(contactMap.values())
        .sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime())
        .slice(0, limit)
    }

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error("Contacts fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const { name, email, phone, organization, notes } = await request.json()

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    await connectDB()

    // Check if contact already exists
    const existingContact = await Contact.findOne({
      user_id: user.id,
      email: email.trim().toLowerCase(),
    })

    if (existingContact) {
      return NextResponse.json({ error: "Contact already exists" }, { status: 409 })
    }

    const contact = new Contact({
      name: name?.trim() || email.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      organization: organization?.trim() || "",
      notes: notes?.trim() || "",
      user_id: user.id,
      org_id: user.org_id,
      last_contacted: new Date(),
    })

    await contact.save()

    return NextResponse.json({ contact })
  } catch (error) {
    console.error("Contact creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
