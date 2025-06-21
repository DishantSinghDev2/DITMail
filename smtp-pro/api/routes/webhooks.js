const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const mysql = require("mysql2/promise")
const redis = require("redis")
const crypto = require("crypto")
const axios = require("axios")

const router = express.Router()

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
})
redisClient.connect().catch(console.error)

// MySQL connection
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ditmail",
  port: process.env.DB_PORT || 3306,
}

// Get webhooks for organization
router.get("/", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [webhooks] = await connection.execute(
      `SELECT * FROM Webhook WHERE organizationId = ? ORDER BY createdAt DESC`,
      [req.user.organizationId],
    )

    await connection.end()

    res.json(webhooks)
  } catch (error) {
    console.error("Get webhooks error:", error)
    res.status(500).json({ error: "Failed to fetch webhooks" })
  }
})

// Create webhook
router.post("/", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { name, url, events, isActive = true, secret } = req.body

    const connection = await mysql.createConnection(dbConfig)

    const [result] = await connection.execute(
      `INSERT INTO Webhook (organizationId, name, url, events, isActive, secret, createdBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.organizationId,
        name,
        url,
        JSON.stringify(events),
        isActive,
        secret || crypto.randomBytes(32).toString("hex"),
        req.user.id,
      ],
    )

    await connection.end()

    res.json({
      message: "Webhook created successfully",
      webhookId: result.insertId,
    })
  } catch (error) {
    console.error("Create webhook error:", error)
    res.status(500).json({ error: "Failed to create webhook" })
  }
})

// Update webhook
router.put("/:id", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { id } = req.params
    const { name, url, events, isActive } = req.body

    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(
      `UPDATE Webhook 
       SET name = ?, url = ?, events = ?, isActive = ?, updatedAt = NOW()
       WHERE id = ? AND organizationId = ?`,
      [name, url, JSON.stringify(events), isActive, id, req.user.organizationId],
    )

    await connection.end()

    res.json({ message: "Webhook updated successfully" })
  } catch (error) {
    console.error("Update webhook error:", error)
    res.status(500).json({ error: "Failed to update webhook" })
  }
})

// Delete webhook
router.delete("/:id", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { id } = req.params

    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(`DELETE FROM Webhook WHERE id = ? AND organizationId = ?`, [id, req.user.organizationId])

    await connection.end()

    res.json({ message: "Webhook deleted successfully" })
  } catch (error) {
    console.error("Delete webhook error:", error)
    res.status(500).json({ error: "Failed to delete webhook" })
  }
})

// Test webhook
router.post("/:id/test", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { id } = req.params

    const connection = await mysql.createConnection(dbConfig)

    const [webhooks] = await connection.execute(`SELECT * FROM Webhook WHERE id = ? AND organizationId = ?`, [
      id,
      req.user.organizationId,
    ])

    await connection.end()

    if (webhooks.length === 0) {
      return res.status(404).json({ error: "Webhook not found" })
    }

    const webhook = webhooks[0]

    // Create test payload
    const testPayload = {
      event: "webhook.test",
      data: {
        message: "This is a test webhook",
        timestamp: new Date().toISOString(),
        webhookId: webhook.id,
      },
    }

    // Send test webhook
    const result = await sendWebhook(webhook, testPayload)

    res.json({
      message: "Test webhook sent",
      success: result.success,
      response: result.response,
      error: result.error,
    })
  } catch (error) {
    console.error("Test webhook error:", error)
    res.status(500).json({ error: "Failed to test webhook" })
  }
})

// Get webhook logs
router.get("/:id/logs", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const connection = await mysql.createConnection(dbConfig)

    // Verify webhook belongs to organization
    const [webhooks] = await connection.execute(`SELECT id FROM Webhook WHERE id = ? AND organizationId = ?`, [
      id,
      req.user.organizationId,
    ])

    if (webhooks.length === 0) {
      await connection.end()
      return res.status(404).json({ error: "Webhook not found" })
    }

    const [logs] = await connection.execute(
      `SELECT * FROM WebhookLog WHERE webhookId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [id, Number.parseInt(limit), offset],
    )

    const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM WebhookLog WHERE webhookId = ?`, [id])

    await connection.end()

    res.json({
      logs,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    })
  } catch (error) {
    console.error("Get webhook logs error:", error)
    res.status(500).json({ error: "Failed to fetch webhook logs" })
  }
})

// Internal function to send webhook
async function sendWebhook(webhook, payload) {
  try {
    const signature = crypto.createHmac("sha256", webhook.secret).update(JSON.stringify(payload)).digest("hex")

    const response = await axios.post(webhook.url, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-DITMail-Signature": `sha256=${signature}`,
        "X-DITMail-Event": payload.event,
        "User-Agent": "DITMail-Webhooks/1.0",
      },
      timeout: 10000,
    })

    // Log successful webhook
    await logWebhook(webhook.id, payload.event, payload, response.status, response.data, null)

    return {
      success: true,
      response: {
        status: response.status,
        data: response.data,
      },
    }
  } catch (error) {
    // Log failed webhook
    await logWebhook(
      webhook.id,
      payload.event,
      payload,
      error.response?.status || 0,
      error.response?.data || null,
      error.message,
    )

    return {
      success: false,
      error: error.message,
      response: error.response
        ? {
            status: error.response.status,
            data: error.response.data,
          }
        : null,
    }
  }
}

// Internal function to log webhook attempts
async function logWebhook(webhookId, event, payload, statusCode, response, error) {
  try {
    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(
      `INSERT INTO WebhookLog (webhookId, event, payload, statusCode, response, error, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [webhookId, event, JSON.stringify(payload), statusCode, response ? JSON.stringify(response) : null, error],
    )

    await connection.end()
  } catch (logError) {
    console.error("Failed to log webhook:", logError)
  }
}

// Function to trigger webhooks (used by other parts of the system)
async function triggerWebhooks(organizationId, event, data) {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [webhooks] = await connection.execute(
      `SELECT * FROM Webhook 
       WHERE organizationId = ? AND isActive = 1 
       AND JSON_CONTAINS(events, ?)`,
      [organizationId, JSON.stringify(event)],
    )

    await connection.end()

    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    }

    // Send webhooks in parallel
    const promises = webhooks.map((webhook) => sendWebhook(webhook, payload))
    await Promise.allSettled(promises)
  } catch (error) {
    console.error("Trigger webhooks error:", error)
  }
}

// Export the trigger function for use in other modules
router.triggerWebhooks = triggerWebhooks

module.exports = router
