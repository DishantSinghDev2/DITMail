// app/api/messages/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { composeEmailSchema } from "@/lib/schemas";
import { SessionUser } from "@/types";
import { logAuditEvent } from "@/lib/audit";
import { mailQueue } from "@/lib/queue";
import Message from "@/models/Message";
import Draft from "@/models/Draft";
import { redis } from "@/lib/redis";

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

    let threadId = validatedData.thread_id;
    if (validatedData.in_reply_to && !threadId) {
        const originalMessage = await Message.findOne({ message_id: validatedData.in_reply_to, user_id: user.id });
        if (originalMessage) {
            threadId = originalMessage.thread_id;
        }
    }
    if (!threadId) {
        threadId = `${new ObjectId().toString()}`;
    }


    const messageId = new ObjectId();

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

    if (validatedData.draft_id_to_delete) {
        await Draft.deleteOne({ _id: validatedData.draft_id_to_delete, user_id: user.id });
    }

    await mailQueue.add("send-email-job", { messageId: sentMessage._id.toString() });

    await logAuditEvent({
      user_id: user.id.toString(),
      action: "email_sent_queued",
      details: { to: validatedData.to, subject: validatedData.subject },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    // Handle self-addressed email :)
    const allRecipients = [...validatedData.to, ...(validatedData.cc || []), ...(validatedData.bcc || [])].map(email => email.toLowerCase());
    if (allRecipients.includes(user.email.toLowerCase())) {
        const inboxCopy = new Message({
            ...sentMessage.toObject(),
            message_id: new ObjectId(),
            folder: 'inbox',
            read: false,
            status: 'received',
        });
        await inboxCopy.save();
    }
    
    // Invalidate Redis Cache
    try {
      const pattern = `cache:msg:${user.id}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(keys);
    } catch (error) {
      console.error("Redis cache invalidation error:", error);
    }

    // Return the newly created message so the UI can optimistically update
    return NextResponse.json({ message: sentMessage });

  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Message creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}