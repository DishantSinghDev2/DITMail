import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Label from "@/models/Label"
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

    const labels = await Label.find({
      user_id: user._id,
    }).sort({ created_at: 1 })

    // Get message counts for each label
    const labelsWithCounts = await Promise.all(
      labels.map(async (label) => {
        const count = await Message.countDocuments({
          user_id: user._id,
          labels: label.name,
        })

        return {
          ...label.toObject(),
          count,
        }
      }),
    )

    return NextResponse.json({ labels: labelsWithCounts })
  } catch (error) {
    console.error("Labels fetch error:", error)
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
      return NextResponse.json({ error: "Label name is required" }, { status: 400 })
    }

    if (name.trim().length > 30) {
      return NextResponse.json({ error: "Label name must be 30 characters or less" }, { status: 400 })
    }

    await connectDB()

    // Check if label already exists
    const existingLabel = await Label.findOne({
      user_id: user._id,
      name: name.trim(),
    })

    if (existingLabel) {
      return NextResponse.json({ error: "Label with this name already exists" }, { status: 409 })
    }

    // Check label limit (max 100 labels per user)
    const labelCount = await Label.countDocuments({ user_id: user._id })
    if (labelCount >= 100) {
      return NextResponse.json({ error: "Maximum label limit reached (100)" }, { status: 400 })
    }

    const label = new Label({
      name: name.trim(),
      color: color || "#3B82F6",
      description: description?.trim() || "",
      user_id: user._id,
      org_id: user.org_id,
    })

    await label.save()

    await logAuditEvent({
      user_id: user._id.toString(),
      action: "label_created",
      details: {
        labelId: label._id,
        labelName: label.name,
      },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ label })
  } catch (error) {
    console.error("Label creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
