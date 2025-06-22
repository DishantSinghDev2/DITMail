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

// Get system overview (Super Admin only)
router.get("/system/overview", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [stats] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM Organization) as totalOrganizations,
        (SELECT COUNT(*) FROM User WHERE isActive = 1) as totalUsers,
        (SELECT COUNT(*) FROM Domain WHERE isActive = 1) as totalDomains,
        (SELECT COUNT(*) FROM EmailAccount WHERE isActive = 1) as totalEmailAccounts,
        (SELECT COUNT(*) FROM Email) as totalEmails,
        (SELECT COUNT(*) FROM Subscription WHERE isActive = 1) as activeSubscriptions,
        (SELECT SUM(amount) FROM Payment WHERE status = 'completed' AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthlyRevenue,
        (SELECT COUNT(*) FROM Payment WHERE status = 'completed' AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthlyPayments
    `)

    // Get recent activities
    const [recentActivities] = await connection.execute(`
      SELECT al.action, al.details, u.name, u.email, o.name as organizationName, al.createdAt
      FROM ActivityLog al
      JOIN User u ON al.userId = u.id
      JOIN Organization o ON u.organizationId = o.id
      ORDER BY al.createdAt DESC
      LIMIT 20
    `)

    // Get system health metrics
    const [systemHealth] = await connection.execute(`
      SELECT 
        AVG(CASE WHEN success = 1 THEN 100 ELSE 0 END) as successRate,
        COUNT(*) as totalRequests
      FROM ActivityLog 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `)

    await connection.end()

    // Get Redis metrics
    const redisInfo = await redisClient.info()
    const redisStats = {
      connected: redisClient.isOpen,
      memory: redisInfo.includes("used_memory_human") ? redisInfo.split("used_memory_human:")[1].split("\r")[0] : "N/A",
    }

    res.json({
      stats: stats[0],
      recentActivities,
      systemHealth: systemHealth[0],
      redisStats,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    })
  } catch (error) {
    console.error("System overview error:", error)
    res.status(500).json({ error: "Failed to fetch system overview" })
  }
})

// Get all organizations (Super Admin only)
router.get("/organizations", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query
    const offset = (page - 1) * limit

    const connection = await mysql.createConnection(dbConfig)

    let query = `SELECT o.*, p.name as planName, s.status as subscriptionStatus,
                        (SELECT COUNT(*) FROM User WHERE organizationId = o.id AND isActive = 1) as userCount,
                        (SELECT COUNT(*) FROM Domain WHERE organizationId = o.id AND isActive = 1) as domainCount
                 FROM Organization o
                 LEFT JOIN Subscription s ON o.id = s.organizationId AND s.isActive = 1
                 LEFT JOIN Plan p ON s.planId = p.id
                 WHERE 1 = 1`
    const params = []

    if (search) {
      query += ` AND (o.name LIKE ? OR o.email LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ` ORDER BY o.createdAt DESC LIMIT ? OFFSET ?`
    params.push(Number.parseInt(limit), offset)

    const [organizations] = await connection.execute(query, params)

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM Organization WHERE 1 = 1`
    const countParams = []

    if (search) {
      countQuery += ` AND (name LIKE ? OR email LIKE ?)`
      countParams.push(`%${search}%`, `%${search}%`)
    }

    const [countResult] = await connection.execute(countQuery, countParams)

    await connection.end()

    res.json({
      organizations,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    })
  } catch (error) {
    console.error("Get organizations error:", error)
    res.status(500).json({ error: "Failed to fetch organizations" })
  }
})

// Update organization status (Super Admin only)
router.put("/organizations/:id/status", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(`UPDATE Organization SET isActive = ?, updatedAt = NOW() WHERE id = ?`, [isActive, id])

    // Also update all users in the organization
    await connection.execute(`UPDATE User SET isActive = ?, updatedAt = NOW() WHERE organizationId = ?`, [isActive, id])

    await connection.end()

    // Clear cache
    await redisClient.del(`org:${id}`)

    res.json({ message: "Organization status updated successfully" })
  } catch (error) {
    console.error("Update organization status error:", error)
    res.status(500).json({ error: "Failed to update organization status" })
  }
})

// Get system logs (Super Admin only)
router.get("/logs", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const { page = 1, limit = 50, level = "", action = "" } = req.query
    const offset = (page - 1) * limit

    const connection = await mysql.createConnection(dbConfig)

    let query = `SELECT sl.*, u.name as userName, u.email as userEmail, o.name as organizationName
                 FROM SystemLog sl
                 LEFT JOIN User u ON sl.userId = u.id
                 LEFT JOIN Organization o ON u.organizationId = o.id
                 WHERE 1 = 1`
    const params = []

    if (level) {
      query += ` AND sl.level = ?`
      params.push(level)
    }

    if (action) {
      query += ` AND sl.action = ?`
      params.push(action)
    }

    query += ` ORDER BY sl.createdAt DESC LIMIT ? OFFSET ?`
    params.push(Number.parseInt(limit), offset)

    const [logs] = await connection.execute(query, params)

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM SystemLog WHERE 1 = 1`
    const countParams = []

    if (level) {
      countQuery += ` AND level = ?`
      countParams.push(level)
    }

    if (action) {
      countQuery += ` AND action = ?`
      countParams.push(action)
    }

    const [countResult] = await connection.execute(countQuery, countParams)

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
    console.error("Get system logs error:", error)
    res.status(500).json({ error: "Failed to fetch system logs" })
  }
})

// Get server maintenance status
router.get("/maintenance", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const maintenanceStatus = await redisClient.get("system:maintenance")

    res.json({
      maintenanceMode: maintenanceStatus === "true",
      message: (await redisClient.get("system:maintenance:message")) || "",
      scheduledAt: await redisClient.get("system:maintenance:scheduled"),
      estimatedDuration: await redisClient.get("system:maintenance:duration"),
    })
  } catch (error) {
    console.error("Get maintenance status error:", error)
    res.status(500).json({ error: "Failed to fetch maintenance status" })
  }
})

// Set maintenance mode
router.post("/maintenance", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const { enabled, message, scheduledAt, estimatedDuration } = req.body

    await redisClient.set("system:maintenance", enabled.toString())

    if (message) {
      await redisClient.set("system:maintenance:message", message)
    }

    if (scheduledAt) {
      await redisClient.set("system:maintenance:scheduled", scheduledAt)
    }

    if (estimatedDuration) {
      await redisClient.set("system:maintenance:duration", estimatedDuration)
    }

    res.json({ message: `Maintenance mode ${enabled ? "enabled" : "disabled"} successfully` })
  } catch (error) {
    console.error("Set maintenance mode error:", error)
    res.status(500).json({ error: "Failed to set maintenance mode" })
  }
})

module.exports = router
