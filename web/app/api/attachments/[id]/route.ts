import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Attachment from "@/models/Attachment"
import { getAuthUser } from "@/lib/auth"
import { downloadFile } from "@/lib/gridfs"
import { Readable } from "stream";

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}


export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const attachment = await Attachment.findOne({ _id: params.id, user_id: user._id })
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }

    const downloadStream = await downloadFile(attachment.gridfs_id.toString())

    const buffer = await streamToBuffer(downloadStream);

    return new Response(buffer, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename="${attachment.filename}"`,
      },
    });

  } catch (error) {
    console.error("File download error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

