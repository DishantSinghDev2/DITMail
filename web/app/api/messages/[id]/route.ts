import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route"; // Ensure this path is correct
import { SessionUser } from "@/types";
import { revalidateTag } from "next/cache";

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

    // Find the message *before* updating to know its original folder for cache invalidation.
    const messageToUpdate = await Message.findOne({ _id: params.id, user_id: user.id }, { folder: 1 }).lean();
    if (!messageToUpdate) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    const originalFolder = messageToUpdate.folder;

    const message = await Message.findOneAndUpdate({ _id: params.id, user_id: user.id }, updates, { new: true });
    if (!message) {
        return NextResponse.json({ error: "Message not found after update" }, { status: 404 });
    }

    // Invalidate cache for the original folder's list and position data.
    revalidateTag(`messages:${user.id}:${originalFolder}`);
    revalidateTag(`messages-position:${user.id}:${originalFolder}`);

    // If the folder was changed, invalidate the new folder's cache too.
    if (updates.folder && updates.folder !== originalFolder) {
        revalidateTag(`messages:${user.id}:${updates.folder}`);
        revalidateTag(`messages-position:${user.id}:${updates.folder}`);
    }
    
    // Also revalidate the specific thread cache in case its properties (like star) changed.
    revalidateTag(`thread:${message._id}`);

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

    // Find the message *before* deleting it to know its folder for cache invalidation.
    const messageToDelete = await Message.findOne({ _id: params.id, user_id: user.id }).lean();
    if (!messageToDelete) {
      // Return a success response even if not found, as the desired state (deleted) is achieved.
      return NextResponse.json({ message: "Message already deleted." });
    }
    const folder = messageToDelete.folder;

    await Message.deleteOne({ _id: params.id, user_id: user.id });

    // Invalidate the cache for the folder the message was in.
    revalidateTag(`messages:${user.id}:${folder}`);
    revalidateTag(`messages-position:${user.id}:${folder}`);
    revalidateTag(`thread:${params.id}`);

    return NextResponse.json({ message: "Message permanently deleted." });
  } catch (error) {
    console.error(`[DELETE /api/messages/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}