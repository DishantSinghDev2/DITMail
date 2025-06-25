import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import EmailSignature from "@/models/EmailSignature"
import { getAuthUser } from "@/lib/auth"
import { asyncHandler } from "@/lib/error-handler"

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const signatures = await EmailSignature.find({ user_id: user._id }).sort({ created_at: -1 })

  return NextResponse.json({ signatures })
})

export const POST = asyncHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, html, text, is_default } = await request.json()
  await connectDB()

  // If this is set as default, unset all other defaults
  if (is_default) {
    await EmailSignature.updateMany({ user_id: user._id }, { is_default: false })
  }

  const signature = new EmailSignature({
    user_id: user._id,
    name,
    html,
    text,
    is_default,
  })

  await signature.save()

  return NextResponse.json({ signature })
})
