import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Attachment from "@/models/Attachment"
import { getAuthUser } from "@/lib/auth"
import { uploadFile } from "@/lib/gridfs"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

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
