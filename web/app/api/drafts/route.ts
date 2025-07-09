import { type NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Draft from "@/models/Draft";
import { getAuthUser } from "@/lib/auth";
import { asyncHandler } from "@/lib/error-handler";

/**
 * GET: Find a draft by conversation ID or create a new draft
 */
export const GET = asyncHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inReplyToId = searchParams.get('in_reply_to_id');

  // This endpoint is specifically for finding a draft by its conversation thread
  if (!inReplyToId) {
    return NextResponse.json({ error: "Query parameter 'in_reply_to_id' is required." }, { status: 400 });
  }

  await connectDB();

  // Find a single draft associated with this conversation thread for this user
  const draft = await Draft.findOne({
    user_id: user._id,
    in_reply_to_id: inReplyToId
  }).populate('attachments'); // Populate attachments if they are stored as refs

  if (!draft) {
    // It's okay if a draft is not found, the client will create a new one.
    return NextResponse.json({ error: "No draft found for this conversation" }, { status: 404 });
  }

  return NextResponse.json({ draft });
});

/**
 * POST: Create a new draft
 */
export const POST = asyncHandler(async (request: NextRequest) => {
    const user = await getAuthUser(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();

    const newDraft = new Draft({
        ...body,
        user_id: user._id,
        created_at: new Date(),
        updated_at: new Date(),
    });

    await newDraft.save();

    return NextResponse.json({ draft: newDraft }, { status: 201 });
});