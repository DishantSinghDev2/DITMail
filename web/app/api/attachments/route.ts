import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Attachment from "@/models/Attachment"
import { getAuthUser } from "@/lib/auth"
import { uploadFile } from "@/lib/gridfs"
import Message from "@/models/Message"
import Draft from "@/models/Draft"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const messageId = formData.get("message_id") as string

    // Validate file input
    if (typeof file !== "object" || !(file instanceof File)) {
      return NextResponse.json({ error: "Invalid file input" }, { status: 400 })
    }

    // Validate message ID
    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
    }

    // check if message or draft exists with the provided ID
    const message = await Message.findOne({ _id: messageId, user_id: user._id })
    const draft = await Draft.findOne({ _id: messageId, user_id: user._id })
    if (!message && !draft) {
      return NextResponse.json({ error: "Message or draft not found" }, { status: 404 })
    }


    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    await connectDB()

    const buffer = Buffer.from(await file.arrayBuffer())
    const gridfsId = await uploadFile(buffer, file.name, file.type)

    const attachment = new Attachment({
      message_id: message ? message._id : draft._id, // Use message ID if exists, otherwise use draft ID
      filename: file.name,
      mimeType: file.type,
      user_id: user._id,
      gridfs_id: gridfsId,
      size: file.size,
    })

    await attachment.save()

    return NextResponse.json({ attachment })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
