import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import Label from "@/models/Label"
import Message from "@/models/Message"
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route"; // Ensure this path is correct
import { SessionUser } from "@/types";
import { logAuditEvent } from "@/lib/audit"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB()

    const label = await Label.findOne({
      _id: params.id,
      user_id: user.id,
    })

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 })
    }

    // Remove label from all messages
    await Message.updateMany(
      {
        user_id: user.id,
        labels: label.name,
      },
      {
        $pull: { labels: label.name },
      },
    )

    await Label.findByIdAndDelete(params.id)

    await logAuditEvent({
      user_id: user.id.toString(),
      action: "label_deleted",
      details: {
        labelId: label._id,
        labelName: label.name,
      },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Label deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
