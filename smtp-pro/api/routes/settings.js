const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const mysql = require("mysql2/promise")
const redis = require("redis")
const bcrypt = require("bcryptjs")

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

// Get user settings
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [users] = await connection.execute(
      `SELECT id, name, email, role, settings, timezone, language, lastLoginAt, createdAt
       FROM User WHERE id = ?`,
      [req.user.id],
    )

    await connection.end()

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const user = users[0]
    user.settings = user.settings ? JSON.parse(user.settings) : {}

    res.json(user)
  } catch (error) {
    console.error("Get user settings error:", error)
    res.status(500).json({ error: "Failed to fetch user settings" })
  }
})

// Update user settings
router.put("/user", authenticateToken, async (req, res) => {
  try {
    const { name, timezone, language, settings } = req.body
    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(
      `UPDATE User SET name = ?, timezone = ?, language = ?, settings = ?, updatedAt = NOW()
       WHERE id = ?`,
      [name, timezone, language, JSON.stringify(settings), req.user.id],
    )

    await connection.end()

    res.json({ message: "User settings updated successfully" })
  } catch (error) {
    console.error("Update user settings error:", error)
    res.status(500).json({ error: "Failed to update user settings" })
  }
})

// Change password
router.put("/user/password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    const connection = await mysql.createConnection(dbConfig)

    const [users] = await connection.execute(`SELECT password FROM User WHERE id = ?`, [req.user.id])

    if (users.length === 0) {
      await connection.end()
      return res.status(404).json({ error: "User not found" })
    }

    const user = users[0]
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)

    if (!isValidPassword) {
      await connection.end()
      return res.status(400).json({ error: "Current password is incorrect" })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await connection.execute(`UPDATE User SET password = ?, updatedAt = NOW() WHERE id = ?`, [
      hashedPassword,
      req.user.id,
    ])

    await connection.end()

    res.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({ error: "Failed to change password" })
  }
})

// Get organization settings
router.get("/organization", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const cacheKey = `org:settings:${req.user.organizationId}`
    let settings = await redisClient.get(cacheKey)

    if (!settings) {
      const connection = await mysql.createConnection(dbConfig)

      const [orgs] = await connection.execute(`SELECT settings FROM Organization WHERE id = ?`, [
        req.user.organizationId,
      ])

      await connection.end()

      if (orgs.length === 0) {
        return res.status(404).json({ error: "Organization not found" })
      }

      settings = orgs[0].settings ? JSON.parse(orgs[0].settings) : {}

      // Cache for 10 minutes
      await redisClient.setEx(cacheKey, 600, JSON.stringify(settings))
    } else {
      settings = JSON.parse(settings)
    }

    res.json(settings)
  } catch (error) {
    console.error("Get organization settings error:", error)
    res.status(500).json({ error: "Failed to fetch organization settings" })
  }
})

// Update organization settings
router.put("/organization", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const settings = req.body
    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(`UPDATE Organization SET settings = ?, updatedAt = NOW() WHERE id = ?`, [
      JSON.stringify(settings),
      req.user.organizationId,
    ])

    await connection.end()

    // Invalidate cache
    await redisClient.del(`org:settings:${req.user.organizationId}`)

    res.json({ message: "Organization settings updated successfully" })
  } catch (error) {
    console.error("Update organization settings error:", error)
    res.status(500).json({ error: "Failed to update organization settings" })
  }
})

// Get system settings
router.get("/system", authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [settings] = await connection.execute(`SELECT key, value, description FROM SystemSetting WHERE isPublic = 1`)

    await connection.end()

    const settingsMap = {}
    settings.forEach((setting) => {
      settingsMap[setting.key] = {
        value: setting.value,
        description: setting.description,
      }
    })

    res.json(settingsMap)
  } catch (error) {
    console.error("Get system settings error:", error)
    res.status(500).json({ error: "Failed to fetch system settings" })
  }
})

// Update system settings (Super Admin only)
router.put("/system", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const settings = req.body
    const connection = await mysql.createConnection(dbConfig)

    for (const [key, data] of Object.entries(settings)) {
      await connection.execute(`UPDATE SystemSetting SET value = ?, updatedAt = NOW() WHERE key = ?`, [data.value, key])
    }

    await connection.end()

    res.json({ message: "System settings updated successfully" })
  } catch (error) {
    console.error("Update system settings error:", error)
    res.status(500).json({ error: "Failed to update system settings" })
  }
})

// Get email settings for user
router.get("/email", authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [accounts] = await connection.execute(
      `SELECT ea.*, d.name as domainName
       FROM EmailAccount ea
       JOIN Domain d ON ea.domainId = d.id
       WHERE ea.userId = ? AND ea.isActive = 1`,
      [req.user.id],
    )

    const [systemSettings] = await connection.execute(
      `SELECT key, value FROM SystemSetting WHERE key IN ('smtp_host', 'imap_host', 'pop3_host', 'smtp_port', 'imap_port', 'pop3_port')`,
    )

    await connection.end()

    const serverSettings = {}
    systemSettings.forEach((setting) => {
      serverSettings[setting.key] = setting.value
    })

    res.json({
      accounts,
      serverSettings,
    })
  } catch (error) {
    console.error("Get email settings error:", error)
    res.status(500).json({ error: "Failed to fetch email settings" })
  }
})

module.exports = router
