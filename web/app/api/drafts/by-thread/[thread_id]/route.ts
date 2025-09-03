import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { asyncHandler } from "@/lib/error-handler";
import { SessionUser } from "@/types";
import Draft from "@/models/Draft";
import Message from "@/models/Message"; // We need the Message model to find the thread
import "@/models/Attachment"; // Ensure the Attachment model is registered for population

/**
 * GET: Finds an existing draft associated with a specific conversation thread for the current user.
 * This is used by the inline reply composer to see if a reply has already been started.
 */
export const GET = asyncHandler(
  async (
    request: NextRequest,
    { params }: { params: { thread_id: string } }
  ) => {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { thread_id } = params;
    if (!thread_id) {
      return NextResponse.json(
        { error: "Thread ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // --- Step 1: Find all message IDs within the specified thread ---
    // We only need the `message_id` field from these documents.
    // Scoping by user_id adds an extra layer of security.
    const messagesInThread = await Message.find(
      { thread_id: thread_id, user_id: user.id },
      { message_id: 1, _id: 0 } // Projection to get only the message_id
    ).lean(); // .lean() is faster as we don't need Mongoose documents here

    // If there are no messages, there can't be a draft replying to one.
    if (messagesInThread.length === 0) {
      return NextResponse.json(
        { error: "No messages found for this thread" },
        { status: 404 }
      );
    }

    // Extract the message IDs into a simple array of strings.
    const messageIdsInThread = messagesInThread.map((msg) => msg.message_id);

    // --- Step 2: Find a draft that is a reply to any of those message IDs ---
    // We sort by `updated_at` descending to get the most recently saved draft
    // in the rare case that more than one exists for the thread.
    const draft = await Draft.findOne({
      user_id: user.id,
      in_reply_to_id: { $in: messageIdsInThread }, // The draft must be a reply to a message in the thread
    })
      .populate("attachments") // Populate the full attachment documents
      .sort({ updated_at: -1 });

    // If no draft is found, it's not an error. The client will just start a new one.
    if (!draft) {
      return NextResponse.json(
        { error: "No draft found for this thread" },
        { status: 404 }
      );
    }

    // If a draft is found, return it.
    return NextResponse.json({ draft });
  }
);