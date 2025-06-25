import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Folder from "@/models/Folder"
import Message from "@/models/Message"
import { getAuthUser } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const folders = await Folder.find({
      user_id: user._id,
    }).sort({ created_at: 1 })

    // Get message counts for each folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const totalCount = await Message.countDocuments({
          user_id: user._id,
          folder: folder._id,
        })

        const unreadCount = await Message.countDocuments({
          user_id: user._id,
          folder: folder._id,
          read: false,
        })

        return {
          ...folder.toObject(),
          totalCount,
          unreadCount,
        }
      }),
    )

    return NextResponse.json({ folders: foldersWithCounts })
  } catch (error) {
    console.error("Folders fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, color, description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
    }

    if (name.trim().length > 50) {
      return NextResponse.json({ error: "Folder name must be 50 characters or less" }, { status: 400 })
    }

    await connectDB()

    // Check if folder already exists
    const existingFolder = await Folder.findOne({
      user_id: user._id,
      name: name.trim(),
    })

    if (existingFolder) {
      return NextResponse.json({ error: "Folder with this name already exists" }, { status: 409 })
    }

    // Check folder limit (max 50 custom folders per user)
    const folderCount = await Folder.countDocuments({ user_id: user._id })
    if (folderCount >= 50) {
      return NextResponse.json({ error: "Maximum folder limit reached (50)" }, { status: 400 })
    }

    const folder = new Folder({
      name: name.trim(),
      color: color || "#3B82F6",
      description: description?.trim() || "",
      user_id: user._id,
      org_id: user.org_id,
    })

    await folder.save()

    await logAuditEvent({
      user_id: user._id.toString(),
      action: "folder_created",
      details: {
        folderId: folder._id,
        folderName: folder.name,
      },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ folder })
  } catch (error) {
    console.error("Folder creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
