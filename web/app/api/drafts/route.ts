// /home/dit/DITMail/web/app/api/drafts/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Draft from "@/models/Draft";
import { getServerSession } from "next-auth";
import { SessionUser } from "@/types";
import { asyncHandler } from "@/lib/error-handler";
import { authOptions } from "../auth/[...nextauth]/route";
import { revalidateTag } from "next/cache";

/**
 * GET: Find a draft by conversation ID or create a new draft
 */
export const GET = asyncHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  // Use the standard, secure way to get the session.
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inReplyToId = searchParams.get('in_reply_to_id');

  await connectDB();

  // Find a single draft associated with this conversation thread for this user
  const draft = await Draft.findOne({
    user_id: user.id,
  }).populate('attachments'); // Populate attachments if they are stored as refs

  if (!draft) {
    // It's okay if a draft is not found, the client will create a new one.
    return NextResponse.json({ error: "No draft found for this conversation" }, { status: 404 });
  }

  return NextResponse.json({ draft });
});

/**
 * POST: Creates a new draft or updates an existing one (upsert).
 * This single endpoint simplifies the client-side logic for auto-saving.
 * The client sends the full draft payload, and this endpoint handles the rest.
 */
export const POST = asyncHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  await connectDB();

  // The 'upsert' logic is now handled by the PATCH endpoint for existing drafts.
  // This POST endpoint is now purely for creating NEW drafts.
  const newDraft = new Draft({
    ...body,
    user_id: user.id,
    created_at: new Date(),
    updated_at: new Date(),
  });

  await newDraft.save();

  // When a new draft is created, invalidate the cache for the drafts folder.
  revalidateTag(`drafts:${user.id}`);

  // Return the full draft object, including the new _id.
  return NextResponse.json({ draft: newDraft }, { status: 201 });
});
