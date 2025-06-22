const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const mysql = require("mysql2/promise")
const redis = require("redis")
const crypto = require("crypto")
const speakeasy = require("speakeasy")
const QRCode = require("qrcode")

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

// Get security settings
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [users] = await connection.execute(`SELECT twoFactorEnabled, backupCodes FROM User WHERE id = ?`, [
      req.user.id,
    ])

    // Get recent login attempts
    const [loginAttempts] = await connection.execute(
      `SELECT ipAddress, userAgent, success, createdAt
       FROM ActivityLog 
       WHERE userId = ? AND action = 'login'
       ORDER BY createdAt DESC 
       LIMIT 10`,
      [req.user.id],
    )

    // Get active sessions
    const [sessions] = await connection.execute(
      `SELECT sessionToken, ipAddress, userAgent, lastActivity, createdAt
       FROM UserSession 
       WHERE userId = ? AND isActive = 1
       ORDER BY lastActivity DESC`,
      [req.user.id],
    )

    await connection.end()

    const user = users[0] || {}

    res.json({
      twoFactorEnabled: user.twoFactorEnabled || false,
      hasBackupCodes: !!user.backupCodes,
      recentLogins: loginAttempts,
      activeSessions: sessions.map((session) => ({
        ...session,
        sessionToken: undefined, // Don't expose full token
        tokenPreview: session.sessionToken ? session.sessionToken.substring(0, 8) + "..." : null,
      })),
    })
  } catch (error) {
    console.error("Get security settings error:", error)
    res.status(500).json({ error: "Failed to fetch security settings" })
  }
})

// Setup 2FA
router.post("/2fa/setup", authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [users] = await connection.execute(`SELECT name, email, twoFactorEnabled FROM User WHERE id = ?`, [
      req.user.id,
    ])

    if (users.length === 0) {
      await connection.end()
      return res.status(404).json({ error: "User not found" })
    }

    const user = users[0]

    if (user.twoFactorEnabled) {
      await connection.end()
      return res.status(400).json({ error: "2FA is already enabled" })
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `DITMail (${user.email})`,
      issuer: "DITMail",
    })

    // Store temp secret in Redis (expires in 10 minutes)
    await redisClient.setEx(`2fa_setup:${req.user.id}`, 600, secret.base32)

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    await connection.end()

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    })
  } catch (error) {
    console.error("2FA setup error:", error)
    res.status(500).json({ error: "Failed to setup 2FA" })
  }
})

// Verify and enable 2FA
router.post("/2fa/verify", authenticateToken, async (req, res) => {
  try {
    const { token } = req.body

    // Get temp secret from Redis
    const secret = await redisClient.get(`2fa_setup:${req.user.id}`)

    if (!secret) {
      return res.status(400).json({ error: "2FA setup session expired. Please start over." })
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: token,
      window: 2,
    })

    if (!verified) {
      return res.status(400).json({ error: "Invalid verification code" })
    }

    // Generate backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString("hex").toUpperCase())
    }

    const connection = await mysql.createConnection(dbConfig)

    // Enable 2FA and store secret
    await connection.execute(
      `UPDATE User 
       SET twoFactorSecret = ?, twoFactorEnabled = 1, backupCodes = ?, updatedAt = NOW()
       WHERE id = ?`,
      [secret, JSON.stringify(backupCodes), req.user.id],
    )

    await connection.end()

    // Clean up temp secret
    await redisClient.del(`2fa_setup:${req.user.id}`)

    res.json({
      message: "2FA enabled successfully",
      backupCodes,
    })
  } catch (error) {
    console.error("2FA verification error:", error)
    res.status(500).json({ error: "Failed to verify 2FA" })
  }
})

// Disable 2FA
router.post("/2fa/disable", authenticateToken, async (req, res) => {
  try {
    const { password, token } = req.body
    const bcrypt = require("bcryptjs")

    const connection = await mysql.createConnection(dbConfig)

    const [users] = await connection.execute(
      `SELECT password, twoFactorSecret, twoFactorEnabled FROM User WHERE id = ?`,
      [req.user.id],
    )

    if (users.length === 0) {
      await connection.end()
      return res.status(404).json({ error: "User not found" })
    }

    const user = users[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      await connection.end()
      return res.status(400).json({ error: "Invalid password" })
    }

    // Verify 2FA token if enabled
    if (user.twoFactorEnabled) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: token,
        window: 2,
      })

      if (!verified) {
        await connection.end()
        return res.status(400).json({ error: "Invalid 2FA code" })
      }
    }

    // Disable 2FA
    await connection.execute(
      `UPDATE User 
       SET twoFactorSecret = NULL, twoFactorEnabled = 0, backupCodes = NULL, updatedAt = NOW()
       WHERE id = ?`,
      [req.user.id],
    )

    await connection.end()

    res.json({ message: "2FA disabled successfully" })
  } catch (error) {
    console.error("2FA disable error:", error)
    res.status(500).json({ error: "Failed to disable 2FA" })
  }
})

// Generate new backup codes
router.post("/backup-codes/regenerate", authenticateToken, async (req, res) => {
  try {
    const { password } = req.body
    const bcrypt = require("bcryptjs")

    const connection = await mysql.createConnection(dbConfig)

    const [users] = await connection.execute(`SELECT password, twoFactorEnabled FROM User WHERE id = ?`, [req.user.id])

    if (users.length === 0) {
      await connection.end()
      return res.status(404).json({ error: "User not found" })
    }

    const user = users[0]

    if (!user.twoFactorEnabled) {
      await connection.end()
      return res.status(400).json({ error: "2FA is not enabled" })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      await connection.end()
      return res.status(400).json({ error: "Invalid password" })
    }

    // Generate new backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString("hex").toUpperCase())
    }

    await connection.execute(`UPDATE User SET backupCodes = ?, updatedAt = NOW() WHERE id = ?`, [
      JSON.stringify(backupCodes),
      req.user.id,
    ])

    await connection.end()

    res.json({
      message: "Backup codes regenerated successfully",
      backupCodes,
    })
  } catch (error) {
    console.error("Backup codes regeneration error:", error)
    res.status(500).json({ error: "Failed to regenerate backup codes" })
  }
})

// Revoke session
router.delete("/sessions/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params
    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(
      `UPDATE UserSession 
       SET isActive = 0, updatedAt = NOW() 
       WHERE id = ? AND userId = ?`,
      [sessionId, req.user.id],
    )

    await connection.end()

    res.json({ message: "Session revoked successfully" })
  } catch (error) {
    console.error("Revoke session error:", error)
    res.status(500).json({ error: "Failed to revoke session" })
  }
})

// Get security audit log
router.get("/audit", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, action } = req.query
    const offset = (page - 1) * limit

    const connection = await mysql.createConnection(dbConfig)

    let query = `SELECT action, details, ipAddress, userAgent, success, createdAt
                 FROM ActivityLog 
                 WHERE userId = ?`
    const params = [req.user.id]

    if (action) {
      query += ` AND action = ?`
      params.push(action)
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`
    params.push(Number.parseInt(limit), offset)

    const [logs] = await connection.execute(query, params)

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM ActivityLog WHERE userId = ?`
    const countParams = [req.user.id]

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
    console.error("Security audit error:", error)
    res.status(500).json({ error: "Failed to fetch security audit log" })
  }
})

module.exports = router
