import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import Folder from "@/models/Folder"
import Message from "@/models/Message"
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route"; // Ensure this path is correct
import { SessionUser } from "@/types";
import { logAuditEvent } from "@/lib/audit"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;
        if (!user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

    await connectDB()

    const folder = await Folder.findOne({
      _id: params.id,
      user_id: user.id,
    })

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // Get message counts
    const totalCount = await Message.countDocuments({
      user_id: user.id,
      folder: folder._id,
    })

    const unreadCount = await Message.countDocuments({
      user_id: user.id,
      folder: folder._id,
      read: false,
    })

    return NextResponse.json({
      folder: {
        ...folder.toObject(),
        totalCount,
        unreadCount,
      },
    })
  } catch (error) {
    console.error("Folder fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json()

    if (updates.name && updates.name.trim().length > 50) {
      return NextResponse.json({ error: "Folder name must be 50 characters or less" }, { status: 400 })
    }

    await connectDB()

    const folder = await Folder.findOne({
      _id: params.id,
      user_id: user.id,
    })

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // Check for duplicate name if updating name
    if (updates.name && updates.name.trim() !== folder.name) {
      const existingFolder = await Folder.findOne({
        user_id: user.id,
        name: updates.name.trim(),
        _id: { $ne: params.id },
      })

      if (existingFolder) {
        return NextResponse.json({ error: "Folder with this name already exists" }, { status: 409 })
      }
    }

    const updatedFolder = await Folder.findByIdAndUpdate(params.id, updates, { new: true })

    await logAuditEvent({
      user_id: user.id.toString(),
      action: "folder_updated",
      details: {
        folderId: folder._id,
        folderName: folder.name,
        updates,
      },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ folder: updatedFolder })
  } catch (error) {
    console.error("Folder update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB()

    const folder = await Folder.findOne({
      _id: params.id,
      user_id: user.id,
    })

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // Check if folder has messages
    const messageCount = await Message.countDocuments({
      user_id: user.id,
      folder: folder._id,
    })

    if (messageCount > 0) {
      // Move messages to inbox before deleting folder
      await Message.updateMany(
        {
          user_id: user.id,
          folder: folder._id,
        },
        {
          folder: "inbox",
        },
      )
    }

    await Folder.findByIdAndDelete(params.id)

    await logAuditEvent({
      user_id: user.id.toString(),
      action: "folder_deleted",
      details: {
        folderId: folder._id,
        folderName: folder.name,
        messageCount,
      },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Folder deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
