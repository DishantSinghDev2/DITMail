const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const mysql = require("mysql2/promise")
const redis = require("redis")

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

// Get email statistics
router.get("/email-stats", authenticateToken, async (req, res) => {
  try {
    const { period = "7d" } = req.query
    let dateFilter = ""

    switch (period) {
      case "24h":
        dateFilter = "AND e.createdAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)"
        break
      case "7d":
        dateFilter = "AND e.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
        break
      case "30d":
        dateFilter = "AND e.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
        break
      case "90d":
        dateFilter = "AND e.createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)"
        break
    }

    const connection = await mysql.createConnection(dbConfig)

    // Email counts by folder
    const [folderStats] = await connection.execute(
      `SELECT f.name as folderName, COUNT(e.id) as emailCount
       FROM Email e
       JOIN Folder f ON e.folderId = f.id
       JOIN EmailAccount ea ON f.emailAccountId = ea.id
       WHERE ea.organizationId = ? ${dateFilter}
       GROUP BY f.id, f.name
       ORDER BY emailCount DESC`,
      [req.user.organizationId],
    )

    // Daily email trends
    const [dailyStats] = await connection.execute(
      `SELECT DATE(e.createdAt) as date, COUNT(e.id) as emailCount,
              SUM(CASE WHEN f.name = 'INBOX' THEN 1 ELSE 0 END) as received,
              SUM(CASE WHEN f.name = 'Sent' THEN 1 ELSE 0 END) as sent
       FROM Email e
       JOIN Folder f ON e.folderId = f.id
       JOIN EmailAccount ea ON f.emailAccountId = ea.id
       WHERE ea.organizationId = ? ${dateFilter}
       GROUP BY DATE(e.createdAt)
       ORDER BY date DESC
       LIMIT 30`,
      [req.user.organizationId],
    )

    // Top senders/receivers
    const [topContacts] = await connection.execute(
      `SELECT 
         CASE 
           WHEN f.name = 'INBOX' THEN e.fromAddress
           WHEN f.name = 'Sent' THEN e.toAddress
           ELSE e.fromAddress
         END as contact,
         COUNT(e.id) as emailCount,
         f.name as folderType
       FROM Email e
       JOIN Folder f ON e.folderId = f.id
       JOIN EmailAccount ea ON f.emailAccountId = ea.id
       WHERE ea.organizationId = ? ${dateFilter}
       GROUP BY contact, f.name
       ORDER BY emailCount DESC
       LIMIT 20`,
      [req.user.organizationId],
    )

    await connection.end()

    res.json({
      period,
      folderStats,
      dailyStats,
      topContacts,
    })
  } catch (error) {
    console.error("Email stats error:", error)
    res.status(500).json({ error: "Failed to fetch email statistics" })
  }
})

// Get storage usage report
router.get("/storage", authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    // Storage by email account
    const [accountStorage] = await connection.execute(
      `SELECT ea.email, 
              COALESCE(SUM(e.size), 0) as usedStorage,
              COUNT(e.id) as emailCount
       FROM EmailAccount ea
       LEFT JOIN Folder f ON ea.id = f.emailAccountId
       LEFT JOIN Email e ON f.id = e.folderId
       WHERE ea.organizationId = ? AND ea.isActive = 1
       GROUP BY ea.id, ea.email
       ORDER BY usedStorage DESC`,
      [req.user.organizationId],
    )

    // Storage by folder type
    const [folderStorage] = await connection.execute(
      `SELECT f.name as folderName,
              COALESCE(SUM(e.size), 0) as usedStorage,
              COUNT(e.id) as emailCount
       FROM Folder f
       LEFT JOIN Email e ON f.id = e.folderId
       JOIN EmailAccount ea ON f.emailAccountId = ea.id
       WHERE ea.organizationId = ?
       GROUP BY f.name
       ORDER BY usedStorage DESC`,
      [req.user.organizationId],
    )

    // Get organization limits
    const [orgLimits] = await connection.execute(
      `SELECT p.limits
       FROM Organization o
       JOIN Subscription s ON o.id = s.organizationId AND s.isActive = 1
       JOIN Plan p ON s.planId = p.id
       WHERE o.id = ?`,
      [req.user.organizationId],
    )

    await connection.end()

    const limits = orgLimits.length > 0 ? JSON.parse(orgLimits[0].limits) : null
    const totalUsed = accountStorage.reduce((sum, account) => sum + Number.parseInt(account.usedStorage), 0)

    res.json({
      accountStorage: accountStorage.map((account) => ({
        ...account,
        usedStorageFormatted: formatBytes(account.usedStorage),
        usedStorage: Number.parseInt(account.usedStorage),
      })),
      folderStorage: folderStorage.map((folder) => ({
        ...folder,
        usedStorageFormatted: formatBytes(folder.usedStorage),
        usedStorage: Number.parseInt(folder.usedStorage),
      })),
      totalUsed,
      totalUsedFormatted: formatBytes(totalUsed),
      limits,
      usagePercentage: limits && limits.maxStorage > 0 ? Math.round((totalUsed / limits.maxStorage) * 100) : 0,
    })
  } catch (error) {
    console.error("Storage report error:", error)
    res.status(500).json({ error: "Failed to fetch storage report" })
  }
})

// Get user activity report
router.get("/user-activity", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { period = "30d" } = req.query
    let dateFilter = ""

    switch (period) {
      case "7d":
        dateFilter = "AND al.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
        break
      case "30d":
        dateFilter = "AND al.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
        break
      case "90d":
        dateFilter = "AND al.createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)"
        break
    }

    const connection = await mysql.createConnection(dbConfig)

    // User login activity
    const [loginActivity] = await connection.execute(
      `SELECT u.name, u.email, 
              COUNT(al.id) as loginCount,
              MAX(al.createdAt) as lastLogin,
              MIN(al.createdAt) as firstLogin
       FROM User u
       LEFT JOIN ActivityLog al ON u.id = al.userId AND al.action = 'login' ${dateFilter}
       WHERE u.organizationId = ? AND u.isActive = 1
       GROUP BY u.id, u.name, u.email
       ORDER BY loginCount DESC`,
      [req.user.organizationId],
    )

    // Email activity by user
    const [emailActivity] = await connection.execute(
      `SELECT u.name, u.email,
              COUNT(CASE WHEN f.name = 'INBOX' THEN e.id END) as emailsReceived,
              COUNT(CASE WHEN f.name = 'Sent' THEN e.id END) as emailsSent,
              COUNT(e.id) as totalEmails
       FROM User u
       LEFT JOIN EmailAccount ea ON u.id = ea.userId
       LEFT JOIN Folder f ON ea.id = f.emailAccountId
       LEFT JOIN Email e ON f.id = e.folderId ${dateFilter.replace("al.", "e.")}
       WHERE u.organizationId = ? AND u.isActive = 1
       GROUP BY u.id, u.name, u.email
       ORDER BY totalEmails DESC`,
      [req.user.organizationId],
    )

    await connection.end()

    res.json({
      period,
      loginActivity,
      emailActivity,
    })
  } catch (error) {
    console.error("User activity report error:", error)
    res.status(500).json({ error: "Failed to fetch user activity report" })
  }
})

// Get system performance metrics
router.get("/system-metrics", authenticateToken, requireRole(["ADMIN", "OWNER", "SUPER_ADMIN"]), async (req, res) => {
  try {
    const { period = "24h" } = req.query

    // Get metrics from Redis (stored by monitoring system)
    const metricsKey = `metrics:${period}:${req.user.organizationId}`
    let metrics = await redisClient.get(metricsKey)

    if (!metrics) {
      // Generate basic metrics from database
      const connection = await mysql.createConnection(dbConfig)

      let dateFilter = ""
      switch (period) {
        case "1h":
          dateFilter = "WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)"
          break
        case "24h":
          dateFilter = "WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)"
          break
        case "7d":
          dateFilter = "WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
          break
      }

      const [emailMetrics] = await connection.execute(
        `SELECT 
           COUNT(*) as totalEmails,
           AVG(processingTime) as avgProcessingTime,
           COUNT(CASE WHEN status = 'delivered' THEN 1 END) as deliveredEmails,
           COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedEmails
         FROM EmailQueue ${dateFilter}`,
      )

      const [connectionMetrics] = await connection.execute(
        `SELECT 
           COUNT(DISTINCT ipAddress) as uniqueConnections,
           COUNT(*) as totalConnections
         FROM ActivityLog 
         ${dateFilter.replace("createdAt", "ActivityLog.createdAt")} 
         AND action = 'login'`,
      )

      await connection.end()

      metrics = {
        emailMetrics: emailMetrics[0],
        connectionMetrics: connectionMetrics[0],
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      }

      // Cache for 5 minutes
      await redisClient.setEx(metricsKey, 300, JSON.stringify(metrics))
    } else {
      metrics = JSON.parse(metrics)
    }

    res.json(metrics)
  } catch (error) {
    console.error("System metrics error:", error)
    res.status(500).json({ error: "Failed to fetch system metrics" })
  }
})

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

module.exports = router
