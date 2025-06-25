import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import { receiveEmail } from "@/lib/smtp"
import { logInfo, logError } from "@/lib/logger"

export async function POST(request: NextRequest) {
  // Only allow localhost connections (from Haraka)
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "127.0.0.1"

  if (ip !== "127.0.0.1" && ip !== "::1") {
    logError(new Error("Unauthorized SMTP receive attempt"), { ip })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await connectDB()

    const emailData = await request.json()

    // Validate required fields
    if (!emailData.from || !emailData.to || !emailData.subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    logInfo("Receiving email via SMTP", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      messageId: emailData.messageId,
    })

    const result = await receiveEmail(emailData)

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    logError(error as Error, { emailData: request.body })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
