import Imap from "imap"
import { simpleParser } from "mailparser"
import { prisma } from "../prisma"

export interface EmailMessage {
  id: string
  messageId: string
  subject: string
  from: { email: string; name?: string }
  to: { email: string; name?: string }[]
  cc?: { email: string; name?: string }[]
  bcc?: { email: string; name?: string }[]
  date: Date
  bodyText?: string
  bodyHtml?: string
  attachments: {
    filename: string
    contentType: string
    size: number
    content: Buffer
  }[]
  headers: Record<string, any>
  flags: string[]
}

export class ImapClient {
  private imap: Imap
  private isConnected = false

  constructor(config: {
    host: string
    port: number
    tls: boolean
    user: string
    password: string
  }) {
    this.imap = new Imap({
      host: config.host,
      port: config.port,
      tls: config.tls,
      user: config.user,
      password: config.password,
      tlsOptions: { rejectUnauthorized: false },
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.imap.once("ready", () => {
      this.isConnected = true
      console.log("IMAP connection ready")
    })

    this.imap.once("error", (err: Error) => {
      console.error("IMAP connection error:", err)
      this.isConnected = false
    })

    this.imap.once("end", () => {
      console.log("IMAP connection ended")
      this.isConnected = false
    })
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve()
        return
      }

      this.imap.once("ready", () => resolve())
      this.imap.once("error", reject)
      this.imap.connect()
    })
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      this.imap.end()
    }
  }

  async getFolders(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.imap.getBoxes((err, boxes) => {
        if (err) reject(err)
        else resolve(boxes)
      })
    })
  }

  async selectFolder(folderName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.imap.openBox(folderName, false, (err, box) => {
        if (err) reject(err)
        else resolve(box)
      })
    })
  }

  async getMessages(folderName: string, criteria: string[] = ["ALL"], limit?: number): Promise<EmailMessage[]> {
    await this.selectFolder(folderName)

    return new Promise((resolve, reject) => {
      this.imap.search(criteria, (err, results) => {
        if (err) {
          reject(err)
          return
        }

        if (!results || results.length === 0) {
          resolve([])
          return
        }

        // Apply limit if specified
        const messageIds = limit ? results.slice(-limit) : results

        const fetch = this.imap.fetch(messageIds, {
          bodies: "",
          struct: true,
          envelope: true,
        })

        const messages: EmailMessage[] = []

        fetch.on("message", (msg, seqno) => {
          let buffer = ""
          let attributes: any

          msg.on("body", (stream) => {
            stream.on("data", (chunk) => {
              buffer += chunk.toString("utf8")
            })
          })

          msg.once("attributes", (attrs) => {
            attributes = attrs
          })

          msg.once("end", async () => {
            try {
              const parsed = await simpleParser(buffer)

              const emailMessage: EmailMessage = {
                id: seqno.toString(),
                messageId: parsed.messageId || `${Date.now()}-${seqno}`,
                subject: parsed.subject || "(No Subject)",
                from: {
                  email: parsed.from?.value[0]?.address || "",
                  name: parsed.from?.value[0]?.name,
                },
                to:
                  parsed.to?.value?.map((addr) => ({
                    email: addr.address || "",
                    name: addr.name,
                  })) || [],
                cc: parsed.cc?.value?.map((addr) => ({
                  email: addr.address || "",
                  name: addr.name,
                })),
                bcc: parsed.bcc?.value?.map((addr) => ({
                  email: addr.address || "",
                  name: addr.name,
                })),
                date: parsed.date || new Date(),
                bodyText: parsed.text,
                bodyHtml: typeof parsed.html === "string" ? parsed.html : undefined,
                attachments:
                  parsed.attachments?.map((att) => ({
                    filename: att.filename || "attachment",
                    contentType: att.contentType || "application/octet-stream",
                    size: att.size || 0,
                    content: att.content,
                  })) || [],
                headers: parsed.headers,
                flags: attributes.flags || [],
              }

              messages.push(emailMessage)
            } catch (parseError) {
              console.error("Error parsing message:", parseError)
            }
          })
        })

        fetch.once("error", reject)
        fetch.once("end", () => resolve(messages))
      })
    })
  }

  async markAsRead(messageIds: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.addFlags(messageIds, ["\\Seen"], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async markAsUnread(messageIds: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.delFlags(messageIds, ["\\Seen"], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async deleteMessages(messageIds: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.addFlags(messageIds, ["\\Deleted"], (err) => {
        if (err) {
          reject(err)
          return
        }

        this.imap.expunge((expungeErr) => {
          if (expungeErr) reject(expungeErr)
          else resolve()
        })
      })
    })
  }

  async moveMessages(messageIds: number[], targetFolder: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.move(messageIds, targetFolder, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

export async function syncEmailsForAccount(emailAccountId: string) {
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    include: {
      domain: true,
      folders: true,
    },
  })

  if (!emailAccount || !emailAccount.imapEnabled) {
    throw new Error("Email account not found or IMAP not enabled")
  }

  const imapClient = new ImapClient({
    host: process.env.IMAP_HOST || "mail.freecustom.email",
    port: Number.parseInt(process.env.IMAP_PORT || "993"),
    tls: true,
    user: emailAccount.email,
    password: emailAccount.password,
  })

  try {
    await imapClient.connect()

    // Sync INBOX
    const messages = await imapClient.getMessages("INBOX", ["UNSEEN"], 50)

    for (const message of messages) {
      // Check if message already exists
      const existingEmail = await prisma.email.findUnique({
        where: { messageId: message.messageId },
      })

      if (!existingEmail) {
        // Find or create INBOX folder
        let inboxFolder = emailAccount.folders.find((f) => f.type === "INBOX")
        if (!inboxFolder) {
          inboxFolder = await prisma.emailFolder.create({
            data: {
              name: "INBOX",
              type: "INBOX",
              emailAccountId: emailAccount.id,
              isSystem: true,
            },
          })
        }

        // Create email record
        const email = await prisma.email.create({
          data: {
            messageId: message.messageId,
            subject: message.subject,
            bodyText: message.bodyText,
            bodyHtml: message.bodyHtml,
            fromEmail: message.from.email,
            fromName: message.from.name,
            priority: "NORMAL",
            isRead: message.flags.includes("\\Seen"),
            headers: message.headers,
            size: Buffer.byteLength(message.bodyText || message.bodyHtml || ""),
            receivedAt: message.date,
            folderId: inboxFolder.id,
          },
        })

        // Create recipients
        for (const recipient of message.to) {
          await prisma.emailRecipient.create({
            data: {
              email: recipient.email,
              name: recipient.name,
              type: "TO",
              emailId: email.id,
              emailAccountId: recipient.email === emailAccount.email ? emailAccount.id : undefined,
            },
          })
        }

        // Create CC recipients
        if (message.cc) {
          for (const recipient of message.cc) {
            await prisma.emailRecipient.create({
              data: {
                email: recipient.email,
                name: recipient.name,
                type: "CC",
                emailId: email.id,
                emailAccountId: recipient.email === emailAccount.email ? emailAccount.id : undefined,
              },
            })
          }
        }

        // Save attachments
        for (const attachment of message.attachments) {
          const filePath = `attachments/${email.id}/${attachment.filename}`

          await prisma.emailAttachment.create({
            data: {
              filename: attachment.filename,
              contentType: attachment.contentType,
              size: attachment.size,
              filePath,
              emailId: email.id,
            },
          })

          // TODO: Save attachment file to storage
        }

        // Update folder counts
        await prisma.emailFolder.update({
          where: { id: inboxFolder.id },
          data: {
            messageCount: { increment: 1 },
            unreadCount: message.flags.includes("\\Seen") ? undefined : { increment: 1 },
          },
        })
      }
    }

    await imapClient.disconnect()

    return {
      success: true,
      syncedCount: messages.length,
    }
  } catch (error) {
    await imapClient.disconnect()
    throw error
  }
}
