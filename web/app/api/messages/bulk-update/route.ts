// app/api/messages/bulk-update/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { SessionUser } from "@/types";
import { revalidateTag } from "next/cache"; // <--- IMPORT THE REVALIDATION FUNCTION
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

    // --- CACHE INVALIDATION STEP 1: Find out which folders are affected ---
    const filter = {
      user_id: user.id,
      _id: { $in: messageIds },
    };

    // Find the original messages to get their folders before the update
    const originalMessages = await Message.find(filter).select('folder').lean();

    // Use a Set to store unique folder names that need revalidation
    const foldersToRevalidate = new Set<string>();
    originalMessages.forEach(msg => foldersToRevalidate.add(msg.folder));


    // 4. Define the update operation based on the action
    let updateOperation: any;

    switch (action) {
      case "delete":
        updateOperation = { $set: { folder: "trash" } };
        foldersToRevalidate.add("trash"); // Add destination folder
        break;
      case "archive":
        updateOperation = { $set: { folder: "archive" } };
        foldersToRevalidate.add("archive"); // Add destination folder
        break;
      case "spam":
        updateOperation = { $set: { folder: "spam" } };
        foldersToRevalidate.add("spam"); // Add destination folder
        break;
      case "unread":
        updateOperation = { $set: { read: false } };
        break;
      case "read":
        updateOperation = { $set: { read: true } };
        break;
      case "star":
        updateOperation = { $set: { starred: true } };
        foldersToRevalidate.add("starred"); // Also revalidate the starred view
        break;
      case "unstar":
        updateOperation = { $set: { starred: false } };
        foldersToRevalidate.add("starred"); // Also revalidate the starred view
        break;
      default:
        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    // 5. Perform the bulk update
    const result = await Message.updateMany(filter, updateOperation);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "No matching messages found to update." },
        { status: 200 }
      );
    }

    // --- CACHE INVALIDATION STEP ---
    // Instead of revalidateTag, we find and delete all cache entries for this user.
    // This ensures that any page they visit next will fetch fresh data.
    try {
      const pattern = `cache:msg:${user.id}:*`;
      console.log(`Invalidating cache with pattern: ${pattern}`);
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`Deleted ${keys.length} cache keys.`);
      }
    } catch (error) {
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