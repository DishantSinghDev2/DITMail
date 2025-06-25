import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Draft from "@/models/Draft"
import { getAuthUser } from "@/lib/auth"
import { asyncHandler } from "@/lib/error-handler"

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const drafts = await Draft.find({ user_id: user._id }).sort({ updated_at: -1 }).populate("attachments")

  return NextResponse.json({ drafts })
})

export const POST = asyncHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const draftData = await request.json()
  await connectDB()

  const draft = new Draft({
    user_id: user._id,
    ...draftData,
    autosaved_at: new Date(),
  })

  await draft.save()

  return NextResponse.json({ draft })
})
