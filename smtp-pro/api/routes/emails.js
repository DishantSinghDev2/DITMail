// Email Management Routes
const express = require("express")
const nodemailer = require("nodemailer")
const redis = require("redis")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
})

// Get mailboxes/folders
router.get("/folders", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email

    // Default folders structure
    const folders = [
      {
        id: "inbox",
        name: "Inbox",
        type: "inbox",
        unreadCount: 0,
        totalCount: 0,
      },
      {
        id: "sent",
        name: "Sent",
        type: "sent",
        unreadCount: 0,
        totalCount: 0,
      },
      {
        id: "drafts",
        name: "Drafts",
        type: "drafts",
        unreadCount: 0,
        totalCount: 0,
      },
      {
        id: "trash",
        name: "Trash",
        type: "trash",
        unreadCount: 0,
        totalCount: 0,
      },
      {
        id: "spam",
        name: "Spam",
        type: "spam",
        unreadCount: 0,
        totalCount: 0,
      },
    ]

    // Get custom folders
    const customFolders = await redisClient.sMembers(`user:${userEmail}:folders`)
    for (const folderName of customFolders) {
      const folderData = await redisClient.hGetAll(`user:${userEmail}:folder:${folderName}`)
      folders.push({
        id: folderName,
        name: folderData.display_name || folderName,
        type: "custom",
        unreadCount: Number.parseInt(folderData.unread_count || 0),
        totalCount: Number.parseInt(folderData.total_count || 0),
        created: new Date(Number.parseInt(folderData.created || 0)),
      })
    }

    // TODO: Get actual message counts from maildir or database

    res.json(folders)
  } catch (error) {
    console.error("Get folders error:", error)
    res.status(500).json({ error: "Failed to fetch folders" })
  }
})

// Create custom folder
router.post("/folders", authenticateToken, async (req, res) => {
  try {
    const { name, displayName } = req.body
    const userEmail = req.user.email

    if (!name) {
      return res.status(400).json({ error: "Folder name required" })
    }

    // Check if folder already exists
    const exists = await redisClient.sIsMember(`user:${userEmail}:folders`, name)
    if (exists) {
      return res.status(409).json({ error: "Folder already exists" })
    }

    // Create folder
    await redisClient.sAdd(`user:${userEmail}:folders`, name)
    await redisClient.hSet(`user:${userEmail}:folder:${name}`, {
      display_name: displayName || name,
      created: Date.now(),
      unread_count: 0,
      total_count: 0,
    })

    res.status(201).json({
      message: "Folder created successfully",
      folder: {
        id: name,
        name: displayName || name,
        type: "custom",
      },
    })
  } catch (error) {
    console.error("Create folder error:", error)
    res.status(500).json({ error: "Failed to create folder" })
  }
})

// Get emails in folder
router.get("/folders/:folderId/messages", authenticateToken, async (req, res) => {
  try {
    const { folderId } = req.params
    const { page = 1, limit = 50, search, unreadOnly = false, sortBy = "date", sortOrder = "desc" } = req.query

    const userEmail = req.user.email
    const offset = (page - 1) * limit

    // This is a simplified implementation
    // In production, you'd query your email storage system (Maildir, database, etc.)

    const messages = []

    // TODO: Implement actual email fetching from Maildir or database
    // For now, return mock data structure

    res.json({
      messages,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: 0,
        pages: 0,
      },
      folder: folderId,
    })
  } catch (error) {
    console.error("Get messages error:", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
})

// Get specific email
router.get("/messages/:messageId", authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params
    const userEmail = req.user.email

    // TODO: Implement actual message fetching
    // This would typically involve reading from Maildir or database

    const message = {
      id: messageId,
      subject: "Sample Email",
      from: { email: "sender@example.com", name: "Sender Name" },
      to: [{ email: userEmail, name: req.user.name }],
      cc: [],
      bcc: [],
      date: new Date(),
      body: {
        text: "This is a sample email body",
        html: "<p>This is a sample email body</p>",
      },
      attachments: [],
      headers: {},
      flags: {
        seen: false,
        flagged: false,
        answered: false,
      },
    }

    res.json(message)
  } catch (error) {
    console.error("Get message error:", error)
    res.status(500).json({ error: "Failed to fetch message" })
  }
})

// Send email
router.post("/send", authenticateToken, async (req, res) => {
  try {
    const {
      to,
      cc = [],
      bcc = [],
      subject,
      body,
      attachments = [],
      priority = "normal",
      requestReadReceipt = false,
    } = req.body

    const userEmail = req.user.email

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: "Recipients required" })
    }

    if (!subject && !body) {
      return res.status(400).json({ error: "Subject or body required" })
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || "localhost",
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: userEmail,
        pass: process.env.SMTP_PASSWORD, // This should be handled differently in production
      },
    })

    // Prepare email
    const mailOptions = {
      from: userEmail,
      to: to.map((recipient) => recipient.email || recipient).join(", "),
      cc: cc.map((recipient) => recipient.email || recipient).join(", "),
      bcc: bcc.map((recipient) => recipient.email || recipient).join(", "),
      subject,
      text: body.text,
      html: body.html,
      attachments: attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        encoding: att.encoding || "base64",
      })),
      priority: priority === "high" ? "high" : priority === "low" ? "low" : "normal",
    }

    if (requestReadReceipt) {
      mailOptions.headers = {
        "Disposition-Notification-To": userEmail,
        "Return-Receipt-To": userEmail,
      }
    }

    // Send email
    const info = await transporter.sendMail(mailOptions)

    // Store in sent folder
    const messageId = info.messageId
    await redisClient.hSet(`user:${userEmail}:sent:${messageId}`, {
      id: messageId,
      to: JSON.stringify(to),
      cc: JSON.stringify(cc),
      bcc: JSON.stringify(bcc),
      subject,
      body: JSON.stringify(body),
      sent_at: Date.now(),
      status: "sent",
    })

    res.json({
      message: "Email sent successfully",
      messageId,
      recipients: to.length + cc.length + bcc.length,
    })
  } catch (error) {
    console.error("Send email error:", error)
    res.status(500).json({ error: "Failed to send email" })
  }
})

// Save draft
router.post("/drafts", authenticateToken, async (req, res) => {
  try {
    const { to = [], cc = [], bcc = [], subject = "", body = { text: "", html: "" }, attachments = [] } = req.body

    const userEmail = req.user.email
    const draftId = require("crypto").randomUUID()

    // Save draft
    await redisClient.hSet(`user:${userEmail}:draft:${draftId}`, {
      id: draftId,
      to: JSON.stringify(to),
      cc: JSON.stringify(cc),
      bcc: JSON.stringify(bcc),
      subject,
      body: JSON.stringify(body),
      attachments: JSON.stringify(attachments),
      created: Date.now(),
      updated: Date.now(),
    })

    await redisClient.sAdd(`user:${userEmail}:drafts`, draftId)

    res.status(201).json({
      message: "Draft saved successfully",
      draftId,
    })
  } catch (error) {
    console.error("Save draft error:", error)
    res.status(500).json({ error: "Failed to save draft" })
  }
})

// Update draft
router.put("/drafts/:draftId", authenticateToken, async (req, res) => {
  try {
    const { draftId } = req.params
    const userEmail = req.user.email

    const updateData = {
      updated: Date.now(),
    }

    const { to, cc, bcc, subject, body, attachments } = req.body

    if (to !== undefined) updateData.to = JSON.stringify(to)
    if (cc !== undefined) updateData.cc = JSON.stringify(cc)
    if (bcc !== undefined) updateData.bcc = JSON.stringify(bcc)
    if (subject !== undefined) updateData.subject = subject
    if (body !== undefined) updateData.body = JSON.stringify(body)
    if (attachments !== undefined) updateData.attachments = JSON.stringify(attachments)

    await redisClient.hSet(`user:${userEmail}:draft:${draftId}`, updateData)

    res.json({ message: "Draft updated successfully" })
  } catch (error) {
    console.error("Update draft error:", error)
    res.status(500).json({ error: "Failed to update draft" })
  }
})

// Delete draft
router.delete("/drafts/:draftId", authenticateToken, async (req, res) => {
  try {
    const { draftId } = req.params
    const userEmail = req.user.email

    await redisClient.del(`user:${userEmail}:draft:${draftId}`)
    await redisClient.sRem(`user:${userEmail}:drafts`, draftId)

    res.json({ message: "Draft deleted successfully" })
  } catch (error) {
    console.error("Delete draft error:", error)
    res.status(500).json({ error: "Failed to delete draft" })
  }
})

// Mark messages as read/unread
router.patch("/messages/mark", authenticateToken, async (req, res) => {
  try {
    const { messageIds, action } = req.body

    if (!messageIds || !Array.isArray(messageIds) || !action) {
      return res.status(400).json({ error: "Message IDs and action required" })
    }

    const userEmail = req.user.email
    const results = []

    for (const messageId of messageIds) {
      try {
        // TODO: Implement actual message flag updates
        // This would typically involve updating Maildir flags or database records

        results.push({ messageId, status: "success" })
      } catch (error) {
        results.push({ messageId, status: "error", message: error.message })
      }
    }

    res.json({
      action,
      results,
      summary: {
        total: messageIds.length,
        successful: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "error").length,
      },
    })
  } catch (error) {
    console.error("Mark messages error:", error)
    res.status(500).json({ error: "Failed to mark messages" })
  }
})

// Move messages to folder
router.patch("/messages/move", authenticateToken, async (req, res) => {
  try {
    const { messageIds, targetFolder } = req.body

    if (!messageIds || !Array.isArray(messageIds) || !targetFolder) {
      return res.status(400).json({ error: "Message IDs and target folder required" })
    }

    const userEmail = req.user.email
    const results = []

    for (const messageId of messageIds) {
      try {
        // TODO: Implement actual message moving
        // This would typically involve moving files in Maildir or updating database records

        results.push({ messageId, status: "success" })
      } catch (error) {
        results.push({ messageId, status: "error", message: error.message })
      }
    }

    res.json({
      targetFolder,
      results,
      summary: {
        total: messageIds.length,
        successful: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "error").length,
      },
    })
  } catch (error) {
    console.error("Move messages error:", error)
    res.status(500).json({ error: "Failed to move messages" })
  }
})

// Delete messages
router.delete("/messages", authenticateToken, async (req, res) => {
  try {
    const { messageIds, permanent = false } = req.body

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: "Message IDs required" })
    }

    const userEmail = req.user.email
    const results = []

    for (const messageId of messageIds) {
      try {
        if (permanent) {
          // TODO: Permanently delete message
        } else {
          // TODO: Move to trash folder
        }

        results.push({ messageId, status: "success" })
      } catch (error) {
        results.push({ messageId, status: "error", message: error.message })
      }
    }

    res.json({
      permanent,
      results,
      summary: {
        total: messageIds.length,
        successful: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "error").length,
      },
    })
  } catch (error) {
    console.error("Delete messages error:", error)
    res.status(500).json({ error: "Failed to delete messages" })
  }
})

// Search emails
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { query, folder, from, to, subject, dateFrom, dateTo, hasAttachment, page = 1, limit = 50 } = req.query

    if (!query && !from && !to && !subject) {
      return res.status(400).json({ error: "Search query required" })
    }

    const userEmail = req.user.email
    const offset = (page - 1) * limit

    // TODO: Implement actual email search
    // This would typically involve full-text search in your email storage system

    const results = []

    res.json({
      query,
      results,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: 0,
        pages: 0,
      },
    })
  } catch (error) {
    console.error("Search emails error:", error)
    res.status(500).json({ error: "Email search failed" })
  }
})

// Get email templates
router.get("/templates", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email
    const templates = []

    // Get user's custom templates
    const userTemplates = await redisClient.sMembers(`user:${userEmail}:templates`)
    for (const templateId of userTemplates) {
      const templateData = await redisClient.hGetAll(`user:${userEmail}:template:${templateId}`)
      templates.push({
        id: templateId,
        name: templateData.name,
        subject: templateData.subject,
        body: JSON.parse(templateData.body || "{}"),
        created: new Date(Number.parseInt(templateData.created || 0)),
        type: "user",
      })
    }

    // Get organization templates
    if (req.user.organization) {
      const orgTemplates = await redisClient.sMembers(`organization:${req.user.organization}:templates`)
      for (const templateId of orgTemplates) {
        const templateData = await redisClient.hGetAll(`organization:${req.user.organization}:template:${templateId}`)
        templates.push({
          id: templateId,
          name: templateData.name,
          subject: templateData.subject,
          body: JSON.parse(templateData.body || "{}"),
          created: new Date(Number.parseInt(templateData.created || 0)),
          type: "organization",
        })
      }
    }

    res.json(templates)
  } catch (error) {
    console.error("Get templates error:", error)
    res.status(500).json({ error: "Failed to fetch templates" })
  }
})

// Create email template
router.post("/templates", authenticateToken, async (req, res) => {
  try {
    const { name, subject, body, isOrganization = false } = req.body
    const userEmail = req.user.email

    if (!name || !subject || !body) {
      return res.status(400).json({ error: "Name, subject, and body required" })
    }

    const templateId = require("crypto").randomUUID()

    if (isOrganization && (req.user.role === "admin" || req.user.role === "super_admin")) {
      // Create organization template
      await redisClient.hSet(`organization:${req.user.organization}:template:${templateId}`, {
        id: templateId,
        name,
        subject,
        body: JSON.stringify(body),
        created: Date.now(),
        created_by: userEmail,
      })
      await redisClient.sAdd(`organization:${req.user.organization}:templates`, templateId)
    } else {
      // Create user template
      await redisClient.hSet(`user:${userEmail}:template:${templateId}`, {
        id: templateId,
        name,
        subject,
        body: JSON.stringify(body),
        created: Date.now(),
      })
      await redisClient.sAdd(`user:${userEmail}:templates`, templateId)
    }

    res.status(201).json({
      message: "Template created successfully",
      templateId,
    })
  } catch (error) {
    console.error("Create template error:", error)
    res.status(500).json({ error: "Failed to create template" })
  }
})

module.exports = router
