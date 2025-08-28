// /app/api/messages/bulk-update/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { SessionUser } from "@/types";
import { revalidateTag } from "next/cache"; // <-- IMPORTED
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the request body
    const { action, messageIds } = await request.json();

    // 3. Validate the input
    if (!action || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'action' and 'messageIds' array are required." },
        { status: 400 }
      );
    }

    await connectDB();

    // --- CACHE INVALIDATION PREPARATION ---
    const filter = {
      user_id: user.id,
      _id: { $in: messageIds },
    };

    // Find the original messages to get their IDs and folders before the update
    // We only need the _id for revalidateTag, but folder is useful for Redis logic.
    const originalMessages = await Message.find(filter).select('_id folder').lean();
    if (originalMessages.length === 0) {
      return NextResponse.json({ message: "No matching messages found." }, { status: 200 });
    }

    // 4. Define the update operation based on the action
    let updateOperation: any;

    switch (action) {
      case "delete":
        updateOperation = { $set: { folder: "trash" } };
        break;
      case "archive":
        updateOperation = { $set: { folder: "archive" } };
        break;
      case "spam":
        updateOperation = { $set: { folder: "spam" } };
        break;
      case "unread":
        updateOperation = { $set: { read: false } };
        break;
      case "read":
        updateOperation = { $set: { read: true } };
        break;
      case "star":
        updateOperation = { $set: { starred: true } };
        break;
      case "unstar":
        updateOperation = { $set: { starred: false } };
        break;
      default:
        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    // 5. Perform the bulk update in the database
    const result = await Message.updateMany(filter, updateOperation);

    // --- CACHE INVALIDATION EXECUTION ---

    // A) Invalidate Next.js cache for each individual thread that was affected.
    // This ensures the MessageViewClient gets fresh data if visited again.
    console.log(`Revalidating unstable_cache tags for ${originalMessages.length} messages.`);
    originalMessages.forEach(msg => {
      const tag = `thread:${msg._id}`;
      revalidateTag(tag);
      console.log(`- Revalidated tag: ${tag}`);
    });

    // B) Invalidate Redis cache for all message lists for this user.
    // This is a "catch-all" to ensure any folder view is refreshed.
    try {
      const pattern = `cache:msg:${user.id}:*`;
      console.log(`Invalidating Redis cache with pattern: ${pattern}`);
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`- Deleted ${keys.length} Redis cache keys.`);
      } else {
        console.log(`- No Redis keys found for pattern.`);
      }
    } catch (error)      {
      // Log the error but don't fail the request, as the main DB operation succeeded.
      console.error("Redis cache invalidation error:", error);
    }
    // --- END OF CACHE INVALIDATION ---

    return NextResponse.json(
      {
        message: "Messages updated successfully.",
        updatedCount: result.modifiedCount,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}