import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Message from "@/models/Message"
import { getAuthUser } from "@/lib/auth"
import { composeEmailSchema } from "@/lib/validations"
import { mailQueue } from "@/lib/queue"; // <--- IMPORT THE QUEUE
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

    const query: any = { user_id: user._id }

    if (threadId) {
      query.thread_id = threadId
    } else {
      query.folder = folder
    }
    if (starred) query.starred = true
    if (unread) query.read = false

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { from: { $regex: search, $options: "i" } },
        { text: { $regex: search, $options: "i" } },
      ]
    }

    let messages

    if (threadId) {
      // This block is ALREADY CORRECT. .populate() is the right way for find()
      messages = await Message.find(query)
        .sort({ created_at: 1 })
        .populate("attachments") // This populates the attachments for a specific thread
    } else {
      // This block needs the $lookup stage for aggregation
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
        // --- START: THE FIX ---
        // This stage "populates" the attachments for each latestMessage
        {
          $lookup: {
            from: "attachments", // The collection name for your Attachment model
            localField: "latestMessage.attachments", // The array of IDs in our documents
            foreignField: "_id", // The field to match in the 'attachments' collection
            as: "populatedAttachments", // The name for the new array of populated docs
          },
        },
        // --- END: THE FIX ---
        { $sort: { "latestMessage.created_at": -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]

      const threads = await Message.aggregate(pipeline)

      // Now, map the results and manually place the populated attachments
      messages = threads.map((thread) => ({
        ...thread.latestMessage,
        attachments: thread.populatedAttachments, // Overwrite the IDs with the full objects
        messageCount: thread.messageCount,
        unreadCount: thread.unreadCount,
      }))
    }

    const total = threadId
      ? await Message.countDocuments(query)
      : await Message.aggregate([
          { $match: { user_id: user._id, folder, ... (search ? { $or: query.$or } : {}) } },
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
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = composeEmailSchema.parse(body);

    await connectDB();

    // Check rate limits (this is good to keep here)
    const recentMessages = await Message.countDocuments({
      user_id: user._id,
      created_at: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
    });
    if (recentMessages >= 100) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const threadId = validatedData.isDraft ? `draft_${Date.now()}` : `${Date.now()}_${user._id}`;

    const message = new Message({
      // All your message fields...
      from: user.email,
      to: validatedData.to,
      cc: validatedData.cc || [],
      bcc: validatedData.bcc || [],
      subject: validatedData.subject,
      html: validatedData.html,
      // ...etc
      // The status is correctly set to 'queued' if not a draft
      status: validatedData.isDraft ? "draft" : "queued",
      folder: validatedData.isDraft ? "drafts" : "sent",
      org_id: user.org_id,
      user_id: user._id,
      thread_id: threadId,
      sent_at: validatedData.isDraft ? undefined : new Date(),
    });

    await message.save();

    // --- REPLACEMENT LOGIC ---
    // If it's not a draft, add a job to the queue instead of sending directly.
    if (!validatedData.isDraft) {
      // The job payload only needs the ID. The worker will fetch the rest.
      await mailQueue.add("send-email-job", { messageId: message._id.toString() });

      // The audit log can stay here, logging the user's intent to send.
      await logAuditEvent({
        user_id: user._id.toString(),
        action: "email_sent_queued", // Changed action name for clarity
        details: { to: validatedData.to, subject: validatedData.subject },
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });
    }
    // --- END OF REPLACEMENT ---

    return NextResponse.json({ message });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Message creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}