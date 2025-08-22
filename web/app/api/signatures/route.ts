import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import EmailSignature from "@/models/EmailSignature"
import { asyncHandler } from "@/lib/error-handler"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { SessionUser } from "@/types"

export const GET = asyncHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  // Use the standard, secure way to get the session.
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB()

  const signatures = await EmailSignature.find({ user_id: user.id }).sort({ created_at: -1 })

  return NextResponse.json({ signatures })
})

export const POST = asyncHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  // Use the standard, secure way to get the session.
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, html, text, is_default } = await request.json()
  await connectDB()

  // If this is set as default, unset all other defaults
  if (is_default) {
    await EmailSignature.updateMany({ user_id: user.id }, { is_default: false })
  }

  const signature = new EmailSignature({
    user_id: user.id,
    name,
    html,
    text,
    is_default,
  })

  await signature.save()

  return NextResponse.json({ signature })
})
