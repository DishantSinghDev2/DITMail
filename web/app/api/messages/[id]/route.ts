import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route"; // Ensure this path is correct
import { SessionUser } from "@/types";
import { revalidateTag } from "next/cache";
import { redis } from "@/lib/redis";

/**
 * GET: Fetches a single message by ID.
 * Also marks the message as read upon fetching.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const message = await Message.findOne({
      _id: params.id,
      user_id: user.id,
    }).populate("attachments");

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Mark as read and invalidate the cache if its status changes.
    if (!message.read) {
      message.read = true;
      await message.save();

      // Invalidate the cache for the folder this message belongs to,
      // so the message list UI updates the "read" status.
      revalidateTag(`messages:${user.id}:${message.folder}`);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error(`[GET /api/messages/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH: Updates a message (e.g., moves to a new folder, stars it).
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();
    await connectDB();

    // Perform the database update
    const message = await Message.findOneAndUpdate(
      { _id: params.id, user_id: user.id },
      updates,
      { new: true }
    );

    if (!message) {
        return NextResponse.json({ error: "Message not found or update failed" }, { status: 404 });
    }

    // --- DUAL CACHE INVALIDATION ---

    // 1. Invalidate Next.js cache for the specific thread.
    // This is for the detailed message view.
    const threadTag = `thread:${params.id}`;
    revalidateTag(threadTag);
    console.log(`Revalidated unstable_cache tag: ${threadTag}`);

    // 2. Invalidate Redis cache for ALL message lists for this user.
    // This is the simplest and most robust way to ensure all list views are fresh.
    try {
      const pattern = `cache:msg:${user.id}:*`;
      console.log(`Invalidating Redis cache with pattern: ${pattern}`);
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`- Deleted ${keys.length} Redis cache keys.`);
      }
    } catch (error) {
      // Log Redis errors but don't fail the entire request
      console.error("Redis cache invalidation error during PATCH:", error);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error(`[PATCH /api/messages/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE: Permanently deletes a message.
 * This should typically only be used for messages in "trash" or "spam".
 */
export async function DELETE (request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const result = await Message.deleteOne({ _id: params.id, user_id: user.id });

    if (result.deletedCount === 0) {
      // If nothing was deleted, we can just say it's successful.
      return NextResponse.json({ message: "Message not found or already deleted." });
    }

    // --- DUAL CACHE INVALIDATION ---

    // 1. Invalidate Next.js cache for the specific thread.
    const threadTag = `thread:${params.id}`;
    revalidateTag(threadTag);
    console.log(`Revalidated unstable_cache tag: ${threadTag}`);

    // 2. Invalidate Redis cache for ALL message lists for this user.
    try {
      const pattern = `cache:msg:${user.id}:*`;
      console.log(`Invalidating Redis cache with pattern: ${pattern}`);
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`- Deleted ${keys.length} Redis cache keys.`);
      }
    } catch (error) {
      console.error("Redis cache invalidation error during DELETE:", error);
    }


    return NextResponse.json({ message: "Message permanently deleted." });
  } catch (error) {
    console.error(`[DELETE /api/messages/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}