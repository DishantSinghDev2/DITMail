import nodemailer from "nodemailer"
import { prisma } from "../prisma"

export interface SendEmailOptions {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  text?: string
  html?: string
  attachments?: {
    filename: string
    content: Buffer
    contentType?: string
  }[]
  replyTo?: string
  priority?: "high" | "normal" | "low"
}

export class SmtpClient {
  private transporter: nodemailer.Transporter

  constructor(config: {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
  }) {
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })
  }

  async sendEmail(options: SendEmailOptions): Promise<{ messageId: string; success: boolean }> {
    try {
      const mailOptions = {
        from: options.from,
        to: options.to.join(", "),
        cc: options.cc?.join(", "),
        bcc: options.bcc?.join(", "),
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        priority: options.priority,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      }

      const result = await this.transporter.sendMail(mailOptions)

      return {
        messageId: result.messageId,
        success: true,
      }
    } catch (error) {
      console.error("SMTP send error:", error)
      throw error
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error("SMTP verification failed:", error)
      return false
    }
  }
}

export async function sendEmailFromAccount(
  emailAccountId: string,
  emailOptions: SendEmailOptions,
  saveToDrafts = false,
): Promise<{ messageId: string; emailId: string }> {
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    include: {
      domain: true,
      folders: true,
    },
  })

  if (!emailAccount || !emailAccount.smtpEnabled) {
    throw new Error("Email account not found or SMTP not enabled")
  }

  const smtpClient = new SmtpClient({
    host: process.env.SMTP_HOST || "mail.freecustom.email",
    port: Number.parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    user: emailAccount.email,
    password: emailAccount.password,
  })

  let messageId: string
  let sentAt: Date | undefined

  if (!saveToDrafts) {
    // Send the email
    const result = await smtpClient.sendEmail({
      ...emailOptions,
      from: emailAccount.email,
    })
    messageId = result.messageId
    sentAt = new Date()
  } else {
    // Generate a draft message ID
    messageId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Find or create appropriate folder
  const folderType = saveToDrafts ? "DRAFTS" : "SENT"
  let folder = emailAccount.folders.find((f) => f.type === folderType)

  if (!folder) {
    folder = await prisma.emailFolder.create({
      data: {
        name: folderType,
        type: folderType,
        emailAccountId: emailAccount.id,
        isSystem: true,
      },
    })
  }

  // Save email to database
  const email = await prisma.email.create({
    data: {
      messageId,
      subject: emailOptions.subject,
      bodyText: emailOptions.text,
      bodyHtml: emailOptions.html,
      fromEmail: emailAccount.email,
      fromName: emailAccount.displayName,
      replyToEmail: emailOptions.replyTo,
      priority: emailOptions.priority === "high" ? "HIGH" : emailOptions.priority === "low" ? "LOW" : "NORMAL",
      isDraft: saveToDrafts,
      isRead: true,
      size: Buffer.byteLength(emailOptions.text || emailOptions.html || ""),
      sentAt,
      folderId: folder.id,
      senderId: emailAccount.id,
    },
  })

  // Create recipients
  for (const recipient of emailOptions.to) {
    await prisma.emailRecipient.create({
      data: {
        email: recipient,
        type: "TO",
        emailId: email.id,
      },
    })
  }

  if (emailOptions.cc) {
    for (const recipient of emailOptions.cc) {
      await prisma.emailRecipient.create({
        data: {
          email: recipient,
          type: "CC",
          emailId: email.id,
        },
      })
    }
  }

  if (emailOptions.bcc) {
    for (const recipient of emailOptions.bcc) {
      await prisma.emailRecipient.create({
        data: {
          email: recipient,
          type: "BCC",
          emailId: email.id,
        },
      })
    }
  }

  // Save attachments
  if (emailOptions.attachments) {
    for (const attachment of emailOptions.attachments) {
      const filePath = `attachments/${email.id}/${attachment.filename}`

      await prisma.emailAttachment.create({
        data: {
          filename: attachment.filename,
          contentType: attachment.contentType || "application/octet-stream",
          size: attachment.content.length,
          filePath,
          emailId: email.id,
        },
      })

      // TODO: Save attachment file to storage
    }
  }

  // Update folder counts
  await prisma.emailFolder.update({
    where: { id: folder.id },
    data: {
      messageCount: { increment: 1 },
    },
  })

  return {
    messageId,
    emailId: email.id,
  }
}
