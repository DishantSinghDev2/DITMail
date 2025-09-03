import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { composeEmailSchema } from "@/lib/schemas"; // Assuming you have this schema
import { SessionUser } from "@/types";
import { logAuditEvent } from "@/lib/audit";
import { mailQueue } from "@/lib/queue";
import Message from "@/models/Message";
import {redis} from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = composeEmailSchema.parse(body);

    await connectDB();

    // Rate limiting check
    const recentMessages = await Message.countDocuments({
      user_id: user.id,
      created_at: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recentMessages >= 100) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const threadId = `${Date.now()}_${user.id}`;
    const messageId = new ObjectId();

    // 1. Create the outgoing message for the 'sent' folder
    const sentMessage = new Message({
      ...validatedData,
      message_id: messageId,
      from: user.email,
      read: true,
      status: "queued",
      folder: "sent",
      org_id: user.org_id,
      user_id: user.id,
      thread_id: threadId,
      sent_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await sentMessage.save();

    // 2. Add the job to the queue for sending
    await mailQueue.add("send-email-job", { messageId: sentMessage._id.toString() });

    // 3. Log the audit event
    await logAuditEvent({
      user_id: user.id.toString(),
      action: "email_sent_queued",
      details: { to: validatedData.to, subject: validatedData.subject },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    // --- FIX: HANDLE SELF-ADDRESSED EMAIL ---
    const allRecipients = [
        ...validatedData.to,
        ...(validatedData.cc || []),
        ...(validatedData.bcc || []),
    ].map(email => email.toLowerCase());

    if (allRecipients.includes(user.email.toLowerCase())) {
        console.log(`Self-addressed email detected. Creating inbox copy for ${user.email}`);
        const inboxCopy = new Message({
            ...sentMessage.toObject(), // Create a copy of the sent message data
            _id: new ObjectId(),      // Give it a new unique database ID
            folder: 'inbox',          // Place it in the inbox
            read: false,              // Mark as unread
            status: 'received',       // Set status to received
        });
        await inboxCopy.save();
    }
    // --- END OF FIX ---

    // 4. Invalidate Redis Cache
    try {
      const pattern = `cache:msg:${user.id}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error("Redis cache invalidation error:", error);
    }

    return NextResponse.json({ message: sentMessage });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Message creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}