import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Message from "@/models/Message"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const message = await Message.findOne({
      _id: params.id,
      user_id: user._id,
    }).populate("attachments")

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // Mark as read
    if (!message.read) {
      message.read = true
      await message.save()
    }

    return NextResponse.json({ message })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = await request.json()

    await connectDB()

    const message = await Message.findOneAndUpdate({ _id: params.id, user_id: user._id }, updates, { new: true })

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE (request: NextRequest, {params}: {params: {id: string}}) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = await request.json()

    await connectDB()

    const message = await Message.findOneAndDelete({ _id: params.id, user_id: user._id })

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}