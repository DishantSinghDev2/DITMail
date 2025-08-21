// /app/api/drafts/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Draft from "@/models/Draft";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { SessionUser } from "@/types";
import { asyncHandler } from "@/lib/error-handler";
import { revalidateTag } from "next/cache";

// GET: Retrieve a specific draft by its ID
export const GET = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Find the draft ensuring it belongs to the authenticated user and populate attachments.
  const draft = await Draft.findOne({ _id: params.id, user_id: user.id }).populate('attachments');

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json({ draft });
});

// PATCH: Update an existing draft
export const PATCH = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await request.json();
  await connectDB();

  const draft = await Draft.findOneAndUpdate(
    { _id: params.id, user_id: user.id },
    { ...updates, autosaved_at: new Date(), updated_at: new Date() },
    { new: true, runValidators: true }
  );

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  
  // When a draft is updated, invalidate the cache for the drafts folder.
  revalidateTag(`drafts:${user.id}`);

  return NextResponse.json({ draft });
});

// DELETE: Discard a draft
export const DELETE = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const result = await Draft.deleteOne({ _id: params.id, user_id: user.id });

  if (result.deletedCount === 0) {
    // It's not necessarily an error if the draft was already gone.
    return NextResponse.json({ message: "Draft not found or already deleted." });
  }
  
  // When a draft is deleted, invalidate the cache for the drafts folder.
  revalidateTag(`drafts:${user.id}`);

  return NextResponse.json({ success: true, message: "Draft discarded successfully." });
});