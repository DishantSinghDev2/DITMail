import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Draft from "@/models/Draft"
import { getAuthUser } from "@/lib/auth"
import { asyncHandler } from "@/lib/error-handler"

export const PATCH = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const updates = await request.json()
  await connectDB()

  const draft = await Draft.findOneAndUpdate(
    { _id: params.id, user_id: user._id },
    { ...updates, autosaved_at: new Date(), updated_at: new Date() },
    { new: true },
  )

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 })
  }

  return NextResponse.json({ draft })
})

export const DELETE = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const draft = await Draft.findOneAndDelete({ _id: params.id, user_id: user._id })

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
})
