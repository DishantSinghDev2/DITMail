// User Management Routes
const express = require("express")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const redis = require("redis")
const { authenticateToken, requireAdmin, checkDomainOwnership } = require("../middleware/auth")

const router = express.Router()

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
})

// Get users (with filtering and pagination)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { domain, page = 1, limit = 50, search, status, role } = req.query

    const users = []
    const offset = (page - 1) * limit

    if (req.user.role === "super_admin") {
      // Super admin can see all users
      // TODO: Implement pagination for all users
    } else if (domain && req.user.organization) {
      // Get users for specific domain
      const domainUsers = await redisClient.sMembers(`domain:${domain}:users`)

      for (const email of domainUsers) {
        const userData = await redisClient.hGetAll(`user:${email}`)
        if (userData) {
          // Apply filters
          if (
            search &&
            !email.toLowerCase().includes(search.toLowerCase()) &&
            !userData.name?.toLowerCase().includes(search.toLowerCase())
          ) {
            continue
          }

          if (status && userData.enabled !== (status === "active" ? "true" : "false")) {
            continue
          }

          if (role && userData.role !== role) {
            continue
          }

          users.push({
            id: userData.id || email,
            email,
            name: userData.name || email.split("@")[0],
            domain: userData.domain,
            role: userData.role || "user",
            enabled: userData.enabled !== "false",
            quota: userData.quota || "1GB",
            created: new Date(Number.parseInt(userData.created || 0)),
            lastLogin: userData.last_login ? new Date(Number.parseInt(userData.last_login)) : null,
            lastIP: userData.last_ip,
            twoFactorEnabled: userData["2fa_enabled"] === "true",
          })
        }
      }
    } else if (req.user.organization) {
      // Get all users in organization
      const orgDomains = await redisClient.sMembers(`organization:${req.user.organization}:domains`)

      for (const domainName of orgDomains) {
        const domainUsers = await redisClient.sMembers(`domain:${domainName}:users`)

        for (const email of domainUsers) {
          const userData = await redisClient.hGetAll(`user:${email}`)
          if (userData) {
            users.push({
              id: userData.id || email,
              email,
              name: userData.name || email.split("@")[0],
              domain: userData.domain,
              role: userData.role || "user",
              enabled: userData.enabled !== "false",
              quota: userData.quota || "1GB",
              created: new Date(Number.parseInt(userData.created || 0)),
              lastLogin: userData.last_login ? new Date(Number.parseInt(userData.last_login)) : null,
            })
          }
        }
      }
    }

    // Sort and paginate
    users.sort((a, b) => b.created - a.created)
    const paginatedUsers = users.slice(offset, offset + Number.parseInt(limit))

    res.json({
      users: paginatedUsers,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: users.length,
        pages: Math.ceil(users.length / limit),
      },
    })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

// Get specific user
router.get("/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params

    // Find user by ID or email
    let userData
    let email = userId

    if (!userId.includes("@")) {
      // Search by ID
      const allUsers = await redisClient.keys("user:*")
      for (const userKey of allUsers) {
        const user = await redisClient.hGetAll(userKey)
        if (user.id === userId) {
          email = userKey.replace("user:", "")
          userData = user
          break
        }
      }
    } else {
      userData = await redisClient.hGetAll(`user:${email}`)
    }

    if (!userData) {
      return res.status(404).json({ error: "User not found" })
    }

    // Check permissions
    if (req.user.role !== "super_admin" && req.user.role !== "admin" && req.user.email !== email) {
      return res.status(403).json({ error: "Access denied" })
    }

    // Remove sensitive data
    delete userData.password
    delete userData["2fa_secret"]
    delete userData["2fa_backup_codes"]

    res.json({
      id: userData.id || email,
      email,
      name: userData.name || email.split("@")[0],
      domain: userData.domain,
      role: userData.role || "user",
      enabled: userData.enabled !== "false",
      quota: userData.quota || "1GB",
      maildir: userData.maildir,
      created: new Date(Number.parseInt(userData.created || 0)),
      updated: userData.updated ? new Date(Number.parseInt(userData.updated)) : null,
      lastLogin: userData.last_login ? new Date(Number.parseInt(userData.last_login)) : null,
      lastIP: userData.last_ip,
      twoFactorEnabled: userData["2fa_enabled"] === "true",
      timezone: userData.timezone,
      language: userData.language || "en",
      avatar: userData.avatar,
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ error: "Failed to fetch user" })
  }
})

// Create new user
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, domain, role = "user", quota = "1GB", enabled = true } = req.body

    // Validation
    if (!email || !password || !domain) {
      return res.status(400).json({ error: "Email, password, and domain required" })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" })
    }

    // Check if user already exists
    const existingUser = await redisClient.exists(`user:${email}`)
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" })
    }

    // Check if domain exists and user has permission
    const domainData = await redisClient.hGetAll(`domain:${domain}`)
    if (!domainData) {
      return res.status(404).json({ error: "Domain not found" })
    }

    // Check domain ownership
    if (req.user.role !== "super_admin" && domainData.organization !== req.user.organization) {
      return res.status(403).json({ error: "Domain access denied" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = crypto.randomUUID()

    // Create user
    await redisClient.hSet(`user:${email}`, {
      id: userId,
      email,
      password: hashedPassword,
      name: name || email.split("@")[0],
      domain,
      role,
      quota,
      enabled: enabled.toString(),
      maildir: `/var/mail/${email}/Maildir`,
      created: Date.now(),
      organization: domainData.organization,
    })

    // Add to domain users
    await redisClient.sAdd(`domain:${domain}:users`, email)
    await redisClient.sAdd(`organization:${domainData.organization}:users`, userId)

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: userId,
        email,
        name: name || email.split("@")[0],
        domain,
        role,
        enabled,
      },
    })
  } catch (error) {
    console.error("Create user error:", error)
    res.status(500).json({ error: "Failed to create user" })
  }
})

// Update user
router.put("/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const { name, role, quota, enabled, timezone, language } = req.body

    // Find user
    let email = userId
    if (!userId.includes("@")) {
      // Search by ID
      const allUsers = await redisClient.keys("user:*")
      for (const userKey of allUsers) {
        const user = await redisClient.hGetAll(userKey)
        if (user.id === userId) {
          email = userKey.replace("user:", "")
          break
        }
      }
    }

    const userData = await redisClient.hGetAll(`user:${email}`)
    if (!userData) {
      return res.status(404).json({ error: "User not found" })
    }

    // Check permissions
    const canEdit = req.user.role === "super_admin" || req.user.role === "admin" || req.user.email === email

    if (!canEdit) {
      return res.status(403).json({ error: "Access denied" })
    }

    // Prepare update data
    const updateData = { updated: Date.now() }

    if (name !== undefined) updateData.name = name
    if (timezone !== undefined) updateData.timezone = timezone
    if (language !== undefined) updateData.language = language

    // Admin-only fields
    if (req.user.role === "admin" || req.user.role === "super_admin") {
      if (role !== undefined) updateData.role = role
      if (quota !== undefined) updateData.quota = quota
      if (enabled !== undefined) updateData.enabled = enabled.toString()
    }

    await redisClient.hSet(`user:${email}`, updateData)

    res.json({ message: "User updated successfully" })
  } catch (error) {
    console.error("Update user error:", error)
    res.status(500).json({ error: "Failed to update user" })
  }
})

// Delete user
router.delete("/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params

    // Find user
    let email = userId
    if (!userId.includes("@")) {
      const allUsers = await redisClient.keys("user:*")
      for (const userKey of allUsers) {
        const user = await redisClient.hGetAll(userKey)
        if (user.id === userId) {
          email = userKey.replace("user:", "")
          break
        }
      }
    }

    const userData = await redisClient.hGetAll(`user:${email}`)
    if (!userData) {
      return res.status(404).json({ error: "User not found" })
    }

    // Check permissions
    if (req.user.role !== "super_admin" && userData.organization !== req.user.organization) {
      return res.status(403).json({ error: "Access denied" })
    }

    // Remove user from all sets
    await redisClient.sRem(`domain:${userData.domain}:users`, email)
    await redisClient.sRem(`organization:${userData.organization}:users`, userData.id)

    // Delete user data
    await redisClient.del(`user:${email}`)

    // TODO: Archive or backup user's emails before deletion

    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ error: "Failed to delete user" })
  }
})

// Reset user password (admin only)
router.post("/:userId/reset-password", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params
    const { newPassword, sendEmail = true } = req.body

    if (!newPassword) {
      return res.status(400).json({ error: "New password required" })
    }

    // Find user
    let email = userId
    if (!userId.includes("@")) {
      const allUsers = await redisClient.keys("user:*")
      for (const userKey of allUsers) {
        const user = await redisClient.hGetAll(userKey)
        if (user.id === userId) {
          email = userKey.replace("user:", "")
          break
        }
      }
    }

    const userData = await redisClient.hGetAll(`user:${email}`)
    if (!userData) {
      return res.status(404).json({ error: "User not found" })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await redisClient.hSet(`user:${email}`, {
      password: hashedPassword,
      password_changed: Date.now(),
      password_reset_by: req.user.email,
    })

    // TODO: Send email notification if requested

    res.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ error: "Failed to reset password" })
  }
})

// Get user's email usage statistics
router.get("/:userId/stats", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const { period = "30d" } = req.query

    // Find user
    let email = userId
    if (!userId.includes("@")) {
      const allUsers = await redisClient.keys("user:*")
      for (const userKey of allUsers) {
        const user = await redisClient.hGetAll(userKey)
        if (user.id === userId) {
          email = userKey.replace("user:", "")
          break
        }
      }
    }

    // Check permissions
    if (req.user.role !== "super_admin" && req.user.role !== "admin" && req.user.email !== email) {
      return res.status(403).json({ error: "Access denied" })
    }

    // Get user statistics
    const stats = {
      emailsSent: 0,
      emailsReceived: 0,
      storageUsed: "0 MB",
      quotaUsed: "0%",
      loginCount: 0,
      lastActivity: null,
    }

    // TODO: Implement actual statistics gathering

    res.json({
      userId,
      email,
      period,
      stats,
      lastUpdated: new Date(),
    })
  } catch (error) {
    console.error("Get user stats error:", error)
    res.status(500).json({ error: "Failed to get user statistics" })
  }
})

// Bulk operations
router.post("/bulk", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { operation, userIds, data } = req.body

    if (!operation || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: "Operation and user IDs required" })
    }

    const results = []

    for (const userId of userIds) {
      try {
        switch (operation) {
          case "enable":
            await redisClient.hSet(`user:${userId}`, "enabled", "true")
            results.push({ userId, status: "success" })
            break

          case "disable":
            await redisClient.hSet(`user:${userId}`, "enabled", "false")
            results.push({ userId, status: "success" })
            break

          case "update_quota":
            if (data.quota) {
              await redisClient.hSet(`user:${userId}`, "quota", data.quota)
              results.push({ userId, status: "success" })
            } else {
              results.push({ userId, status: "error", message: "Quota not specified" })
            }
            break

          default:
            results.push({ userId, status: "error", message: "Unknown operation" })
        }
      } catch (error) {
        results.push({ userId, status: "error", message: error.message })
      }
    }

    res.json({
      operation,
      results,
      summary: {
        total: userIds.length,
        successful: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "error").length,
      },
    })
  } catch (error) {
    console.error("Bulk operation error:", error)
    res.status(500).json({ error: "Bulk operation failed" })
  }
})

module.exports = router
