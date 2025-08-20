// /home/dit/DITMail/web/app/api/messages/route.ts
import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Message from "@/models/Message"
import Draft from "@/models/Draft"
import User from "@/models/User"
import { getAuthUser } from "@/lib/auth"
import { composeEmailSchema } from "@/lib/validations"
import { mailQueue } from "@/lib/queue"; // <--- IMPORT THE QUEUE
import { logAuditEvent } from "@/lib/audit"
import "@/models/Attachment" // Ensure Attachment model is loaded

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "inbox";
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "25");
    const search = searchParams.get("search") || "";
    const threadId = searchParams.get("threadId");
    const starred = searchParams.get("starred") === "true";
    const unread = searchParams.get("unread") === "true";
    const hasAttachments = searchParams.get("hasAttachments") === "true";
    const priority = searchParams.get("priority") || "";
    const timeRange = searchParams.get("timeRange") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sender = searchParams.get("sender") || "";
    const recipient = searchParams.get("recipient") || "";
    const size = searchParams.get("size") || "";
    const label = searchParams.get("label") || "";

    await connectDB();

    // --- ADDED: Fetch user's storage details ---
    const userDetailsAggregation = await User.aggregate([
      { $match: { _id: user._id } },
      // Join with organizations
      {
        $lookup: {
          from: "organizations",
          localField: "org_id",
          foreignField: "_id",
          as: "org_data",
        },
      },
      { $unwind: { path: "$org_data", preserveNullAndEmptyArrays: true } },
      // Join with plans
      {
        $lookup: {
          from: "plans",
          localField: "org_data.plan_id",
          foreignField: "_id",
          as: "plan_data",
        },
      },
      { $unwind: { path: "$plan_data", preserveNullAndEmptyArrays: true } },
    ]);

    const userDetails = userDetailsAggregation[0];
    
    // Usage is stored in KB, convert to GB
    const usedStorageKB = userDetails?.plan_usage?.storage || 0;
    const usedStorageGB = usedStorageKB / (1024 * 1024);

    // Limit is stored in GB
    const storageLimitGB = userDetails?.plan_data?.limits?.storage || 0;

    const storageInfo = {
      used: usedStorageGB,
      limit: storageLimitGB,
    };
    // --- END of added section ---

    // Handle "drafts" folder separately by querying the Draft collection
    if (folder === "drafts") {
      const draftQuery: any = { user_id: user._id };

      if (search) {
        draftQuery.$or = [
          { subject: { $regex: search, $options: "i" } },
          { to: { $regex: search, $options: "i" } },
          { text: { $regex: search, $options: "i" } },
        ];
      }

      const drafts = await Draft.find(draftQuery)
        .sort({ updated_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("attachments");

      const total = await Draft.countDocuments(draftQuery);

      return NextResponse.json({
        messages: drafts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        storage: storageInfo, // Add storage info to response
      });
    }

    const query: any = { user_id: user._id };

    if (threadId) {
      query.thread_id = threadId;
    } else if (folder === "starred") {
      query.starred = true;
    } else {
      query.folder = folder;
    }

    if (starred) query.starred = true;
    if (unread) query.read = false;
    if (hasAttachments) query.attachments = { $exists: true, $ne: [] };
    if (priority) query.priority = priority;

    if (timeRange) {
        const now = new Date();
        switch (timeRange) {
          case "today":
            query.created_at = {
              $gte: new Date(now.setHours(0, 0, 0, 0)),
              $lte: new Date(now.setHours(23, 59, 59, 999)),
            };
            break;
          case "yesterday":
            const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
            query.created_at = {
              $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
              $lte: new Date(yesterday.setHours(23, 59, 59, 999)),
            };
            break;
          case "week":
            const weekStart = new Date(new Date().setDate(new Date().getDate() - new Date().getDay()));
            query.created_at = { $gte: new Date(weekStart.setHours(0, 0, 0, 0)) };
            break;
          case "month":
            query.created_at = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
            break;
          case "3months":
            query.created_at = { $gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) };
            break;
          case "year":
            query.created_at = { $gte: new Date(now.getFullYear(), 0, 1) };
            break;
          case "custom":
            if (startDate || endDate) {
              query.created_at = {
                ...(startDate ? { $gte: new Date(startDate) } : {}),
                ...(endDate ? { $lte: new Date(endDate) } : {}),
              };
            }
            break;
        }
      }

    if (sender) query.from = { $regex: sender, $options: "i" };
    if (recipient) query.to = { $regex: recipient, $options: "i" };
    if (size) {
      switch (size) {
        case "small":
          query.size = { $lt: 1024 * 1024 };
          break;
        case "medium":
          query.size = { $gte: 1024 * 1024, $lt: 10 * 1024 * 1024 };
          break;
        case "large":
          query.size = { $gte: 10 * 1024 * 1024, $lt: 25 * 1024 * 1024 };
          break;
        case "huge":
          query.size = { $gte: 25 * 1024 * 1024 };
          break;
      }
    }
    if (label) query.labels = label;

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { from: { $regex: search, $options: "i" } },
        { text: { $regex: search, $options: "i" } },
      ];
    }

    let messages;

    if (threadId) {
      messages = await Message.find(query)
        .sort({ created_at: 1 })
        .populate("attachments");
    } else {
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
        {
          $lookup: {
            from: "attachments",
            localField: "latestMessage.attachments",
            foreignField: "_id",
            as: "populatedAttachments",
          },
        },
        { $sort: { "latestMessage.created_at": -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];

      const threads = await Message.aggregate(pipeline);

      messages = threads.map((thread) => ({
        ...thread.latestMessage,
        attachments: thread.populatedAttachments,
        messageCount: thread.messageCount,
        unreadCount: thread.unreadCount,
      }));
    }

    const total = threadId
      ? await Message.countDocuments(query)
      : await Message.aggregate([
          { $match: query },
          { $group: { _id: "$thread_id" } },
          { $count: "total" },
        ]).then((result) => result[0]?.total || 0);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      storage: storageInfo, // Add storage info to response
    });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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