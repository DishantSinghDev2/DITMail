import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Message from "@/models/Message"
import { getAuthUser } from "@/lib/auth"
import { composeEmailSchema } from "@/lib/validations"
import { sendEmail } from "@/lib/smtp"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folder = searchParams.get("folder") || "inbox"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const search = searchParams.get("search") || ""
    const threadId = searchParams.get("threadId")
    const starred = searchParams.get("starred") === "true"
    const unread = searchParams.get("unread") === "true"

    await connectDB()

    // Build query
    const query: any = { user_id: user._id }

    if (threadId) {
      query.thread_id = threadId
    } else {
      query.folder = folder
    }

    if (starred) {
      query.starred = true
    }

    if (unread) {
      query.read = false
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { from: { $regex: search, $options: "i" } },
        { text: { $regex: search, $options: "i" } },
      ]
    }

    // Get messages with threading
    let messages
    if (threadId) {
      messages = await Message.find(query).sort({ created_at: 1 }).populate("attachments")
    } else {
      // Group by thread and get latest message from each thread
      const pipeline = [
        { $match: query },
        { $sort: { created_at: -1 } },
        {
          $group: {
            _id: "$thread_id",
            latestMessage: { $first: "$$ROOT" },
            messageCount: { $sum: 1 },
            unreadCount: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
          },
        },
        { $sort: { "latestMessage.created_at": -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]

      const threads = await Message.aggregate(pipeline)
      messages = threads.map((thread) => ({
        ...thread.latestMessage,
        messageCount: thread.messageCount,
        unreadCount: thread.unreadCount,
      }))
    }

    const total = threadId
      ? await Message.countDocuments(query)
      : await Message.aggregate([
          { $match: { user_id: user._id, folder } },
          { $group: { _id: "$thread_id" } },
          { $count: "total" },
        ]).then((result) => result[0]?.total || 0)

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = composeEmailSchema.parse(body)

    await connectDB()

    // Check rate limits
    const recentMessages = await Message.countDocuments({
      user_id: user._id,
      created_at: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
    })

    if (recentMessages >= 100) {
      // 100 emails per hour limit
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    // Generate thread ID for new conversation
    const threadId = validatedData.isDraft
      ? `draft_${Date.now()}_${Math.random().toString(36).substring(7)}`
      : `${Date.now()}_${Math.random().toString(36).substring(7)}`

    const message = new Message({
      message_id: `${Date.now()}.${Math.random().toString(36).substring(7)}@${user.email.split("@")[1]}`,
      from: user.email,
      to: validatedData.to,
      cc: validatedData.cc || [],
      bcc: validatedData.bcc || [],
      subject: validatedData.subject,
      html: validatedData.html,
      text: validatedData.text,
      attachments: validatedData.attachments || [],
      status: validatedData.isDraft ? "draft" : "queued",
      folder: validatedData.isDraft ? "drafts" : "sent",
      org_id: user.org_id,
      user_id: user._id,
      thread_id: threadId,
      size: Buffer.byteLength(validatedData.html, "utf8"),
      sent_at: validatedData.isDraft ? undefined : new Date(),
    })

    await message.save()

    // Send email if not draft
    if (!validatedData.isDraft) {
      try {
        await sendEmail(message)

        await logAuditEvent({
          user_id: user._id.toString(),
          action: "email_sent",
          details: {
            to: validatedData.to,
            subject: validatedData.subject,
            messageId: message.message_id,
          },
          ip: request.headers.get("x-forwarded-for") || "unknown",
        })
      } catch (error) {
        console.error("Email send error:", error)
        // Message status already updated in sendEmail function
      }
    }

    return NextResponse.json({ message })
  } catch (error) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Message creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
