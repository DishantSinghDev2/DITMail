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

// Get organization details
router.get("/", authenticateToken, async (req, res) => {
  try {
    const cacheKey = `org:${req.user.organizationId}`
    let orgData = await redisClient.get(cacheKey)

    if (!orgData) {
      const connection = await mysql.createConnection(dbConfig)

      const [orgs] = await connection.execute(
        `SELECT o.*, p.name as planName, p.features, p.limits, s.status as subscriptionStatus
         FROM Organization o
         LEFT JOIN Subscription s ON o.id = s.organizationId AND s.isActive = 1
         LEFT JOIN Plan p ON s.planId = p.id
         WHERE o.id = ?`,
        [req.user.organizationId],
      )

      await connection.end()

      if (orgs.length === 0) {
        return res.status(404).json({ error: "Organization not found" })
      }

      orgData = orgs[0]
      // Cache for 10 minutes
      await redisClient.setEx(cacheKey, 600, JSON.stringify(orgData))
    } else {
      orgData = JSON.parse(orgData)
    }

    res.json(orgData)
  } catch (error) {
    console.error("Get organization error:", error)
    res.status(500).json({ error: "Failed to fetch organization" })
  }
})

// Update organization
router.put("/", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { name, website, phone, address, settings } = req.body
    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(
      `UPDATE Organization 
       SET name = ?, website = ?, phone = ?, address = ?, settings = ?, updatedAt = NOW()
       WHERE id = ?`,
      [name, website, phone, JSON.stringify(address), JSON.stringify(settings), req.user.organizationId],
    )

    await connection.end()

    // Invalidate cache
    await redisClient.del(`org:${req.user.organizationId}`)

    res.json({ message: "Organization updated successfully" })
  } catch (error) {
    console.error("Update organization error:", error)
    res.status(500).json({ error: "Failed to update organization" })
  }
})

// Get organization users
router.get("/users", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query
    const offset = (page - 1) * limit

    const connection = await mysql.createConnection(dbConfig)

    let query = `SELECT id, name, email, role, isActive, lastLoginAt, createdAt 
                 FROM User 
                 WHERE organizationId = ?`
    const params = [req.user.organizationId]

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`
    params.push(Number.parseInt(limit), offset)

    const [users] = await connection.execute(query, params)

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM User WHERE organizationId = ?`
    const countParams = [req.user.organizationId]

    if (search) {
      countQuery += ` AND (name LIKE ? OR email LIKE ?)`
      countParams.push(`%${search}%`, `%${search}%`)
    }

    const [countResult] = await connection.execute(countQuery, countParams)

    await connection.end()

    res.json({
      users,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    })
  } catch (error) {
    console.error("Get organization users error:", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

// Invite user to organization
router.post("/users/invite", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { email, role = "USER" } = req.body

    const connection = await mysql.createConnection(dbConfig)

    // Check if user already exists in organization
    const [existingUsers] = await connection.execute(`SELECT id FROM User WHERE email = ? AND organizationId = ?`, [
      email,
      req.user.organizationId,
    ])

    if (existingUsers.length > 0) {
      await connection.end()
      return res.status(400).json({ error: "User already exists in organization" })
    }

    // Create invitation
    const inviteToken = require("crypto").randomBytes(32).toString("hex")

    await connection.execute(
      `INSERT INTO OrganizationInvitation (organizationId, email, role, inviteToken, invitedBy, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [req.user.organizationId, email, role, inviteToken, req.user.id],
    )

    await connection.end()

    // Cache invitation for quick lookup
    await redisClient.setEx(
      `invite:${inviteToken}`,
      604800,
      JSON.stringify({
        organizationId: req.user.organizationId,
        email,
        role,
        invitedBy: req.user.id,
      }),
    )

    // TODO: Send invitation email

    res.json({
      message: "Invitation sent successfully",
      inviteToken,
    })
  } catch (error) {
    console.error("Invite user error:", error)
    res.status(500).json({ error: "Failed to send invitation" })
  }
})

// Get organization stats
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const cacheKey = `org:stats:${req.user.organizationId}`
    let stats = await redisClient.get(cacheKey)

    if (!stats) {
      const connection = await mysql.createConnection(dbConfig)

      const [userCount] = await connection.execute(
        `SELECT COUNT(*) as count FROM User WHERE organizationId = ? AND isActive = 1`,
        [req.user.organizationId],
      )

      const [domainCount] = await connection.execute(
        `SELECT COUNT(*) as count FROM Domain WHERE organizationId = ? AND isActive = 1`,
        [req.user.organizationId],
      )

      const [emailAccountCount] = await connection.execute(
        `SELECT COUNT(*) as count FROM EmailAccount WHERE organizationId = ? AND isActive = 1`,
        [req.user.organizationId],
      )

      const [emailCount] = await connection.execute(
        `SELECT COUNT(*) as count FROM Email e
         JOIN Folder f ON e.folderId = f.id
         JOIN EmailAccount ea ON f.emailAccountId = ea.id
         WHERE ea.organizationId = ?`,
        [req.user.organizationId],
      )

      const [storageUsed] = await connection.execute(
        `SELECT COALESCE(SUM(e.size), 0) as totalSize FROM Email e
         JOIN Folder f ON e.folderId = f.id
         JOIN EmailAccount ea ON f.emailAccountId = ea.id
         WHERE ea.organizationId = ?`,
        [req.user.organizationId],
      )

      await connection.end()

      stats = {
        users: userCount[0].count,
        domains: domainCount[0].count,
        emailAccounts: emailAccountCount[0].count,
        emails: emailCount[0].count,
        storageUsed: storageUsed[0].totalSize || 0,
        storageUsedFormatted: formatBytes(storageUsed[0].totalSize || 0),
      }

      // Cache for 5 minutes
      await redisClient.setEx(cacheKey, 300, JSON.stringify(stats))
    } else {
      stats = JSON.parse(stats)
    }

    res.json(stats)
  } catch (error) {
    console.error("Get organization stats error:", error)
    res.status(500).json({ error: "Failed to fetch organization stats" })
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
