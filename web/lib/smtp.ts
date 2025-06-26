import nodemailer from "nodemailer"
import { DKIMSign } from "node-dkim"
import Domain from "@/models/Domain"
import Message from "@/models/Message"
import { publishMailboxEvent } from "./redis"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number.parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(messageData: any) {
  try {
    // Get domain for DKIM signing
    const fromDomain = messageData.from.split("@")[1]
    const domain = await Domain.findOne({ domain: fromDomain, status: "verified" })

    if (!domain) {
      throw new Error(`Domain ${fromDomain} not verified`)
    }

    // Generate message ID
    const messageId = `${Date.now()}.${Math.random().toString(36).substring(7)}@${fromDomain}`

    // Prepare email content
    let emailContent = `Message-ID: <${messageId}>\r\n`
    emailContent += `Date: ${new Date().toUTCString()}\r\n`
    emailContent += `From: ${messageData.from}\r\n`
    emailContent += `To: ${messageData.to.join(", ")}\r\n`

    if (messageData.cc?.length) {
      emailContent += `Cc: ${messageData.cc.join(", ")}\r\n`
    }

    emailContent += `Subject: ${messageData.subject}\r\n`
    emailContent += `MIME-Version: 1.0\r\n`
    emailContent += `Content-Type: text/html; charset=utf-8\r\n`
    emailContent += `\r\n${messageData.html}`

    // Sign with DKIM
    const dkimSignature = DKIMSign(emailContent, {
      domainName: fromDomain,
      keySelector: "default",
      privateKey: domain.dkim_private_key,
    })

    const signedEmail = dkimSignature + emailContent

    // Send via SMTP
    const info = await transporter.sendMail({
      from: messageData.from,
      to: messageData.to,
      cc: messageData.cc,
      bcc: messageData.bcc,
      subject: messageData.subject,
      html: messageData.html,
      text: messageData.text,
      messageId,
      headers: {
        "DKIM-Signature": dkimSignature.split("\r\n")[0].replace("DKIM-Signature: ", ""),
      },
    })

    // Update message status
    await Message.findByIdAndUpdate(messageData._id, {
      status: "sent",
      sent_at: new Date(),
      message_id: messageId,
    })

    // Notify recipients of new mail
    for (const recipient of messageData.to) {
      await publishMailboxEvent(recipient, {
        type: "new_mail",
        mailbox: recipient,
        messageId,
        subject: messageData.subject,
        from: messageData.from,
        date: new Date(),
      })
    }

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("SMTP send error:", error)

    // Update message status to failed
    await Message.findByIdAndUpdate(messageData._id, {
      status: "failed",
    })

    throw error
  }
}

export async function receiveEmail(emailData: any) {
  try {
    // Parse incoming email and store in database
    const messageId = emailData.messageId || `${Date.now()}.${Math.random().toString(36).substring(7)}`

    // Determine recipient's organization
    const recipientDomain = emailData.to[0].split("@")[1]
    const domain = await Domain.findOne({ domain: recipientDomain, status: "verified" })

    if (!domain) {
      throw new Error(`Domain ${recipientDomain} not found or not verified`)
    }

    // Find recipient user
    const User = (await import("@/models/User")).default
    const recipient = await User.findOne({ email: emailData.to[0] })

    if (!recipient) {
      // Check for aliases or catch-all
      const alias = await (await import("@/models/Alias")).default.findOne({
        alias: emailData.to[0],
        domain_id: domain._id,
        active: true,
      })

      if (alias) {
        // Forward to alias destinations
        for (const dest of alias.destination) {
          await receiveEmail({ ...emailData, to: [dest] })
        }
        return
      }

      // Check catch-all
      const catchAll = await (await import("@/models/CatchAll")).default.findOne({
        domain_id: domain._id,
        active: true,
      })

      if (catchAll) {
        await receiveEmail({ ...emailData, to: [catchAll.destination] })
        return
      }

      throw new Error(`Recipient ${emailData.to[0]} not found`)
    }

    // Generate thread ID
    const threadId = emailData.inReplyTo
      ? (await Message.findOne({ message_id: emailData.inReplyTo }))?.thread_id || messageId
      : messageId

    // Create message
    const message = new Message({
      message_id: messageId,
      in_reply_to: emailData.inReplyTo,
      references: emailData.references || [],
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc || [],
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      status: "received",
      folder: "inbox",
      org_id: recipient.org_id,
      user_id: recipient._id,
      thread_id: threadId,
      size: Buffer.byteLength(emailData.html || emailData.text || "", "utf8"),
      received_at: new Date(),
      headers: new Map(Object.entries(emailData.headers || {})),
    })

    await message.save()

    // Publish real-time event
    await publishMailboxEvent(emailData.to[0], {
      type: "new_mail",
      mailbox: emailData.to[0],
      messageId,
      subject: emailData.subject,
      from: emailData.from,
      date: new Date(),
    })

    return { success: true, messageId }
  } catch (error) {
    console.error("Email receive error:", error)
    throw error
  }
}
