// Authentication Routes
const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const redis = require("redis")
const { authenticateToken, sensitiveRateLimit } = require("../middleware/auth")

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, remember = false } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" })
    }

    // Check user credentials
    const userData = await redisClient.hGetAll(`user:${email}`)
    if (!userData || !userData.password) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, userData.password)
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Check if account is enabled
    if (userData.enabled === "false") {
      return res.status(401).json({ error: "Account disabled" })
    }

    // Generate tokens
    const tokenExpiry = remember ? "30d" : "24h"
    const refreshTokenExpiry = remember ? "90d" : "7d"

    const accessToken = jwt.sign(
      {
        id: userData.id || email,
        email,
        domain: userData.domain,
        role: userData.role || "user",
      },
      JWT_SECRET,
      { expiresIn: tokenExpiry },
    )

    const refreshToken = crypto.randomBytes(64).toString("hex")

    // Store refresh token
    await redisClient.setEx(`refresh_token:${refreshToken}`, remember ? 90 * 24 * 60 * 60 : 7 * 24 * 60 * 60, email)

    // Update last login
    await redisClient.hSet(`user:${email}`, {
      last_login: Date.now(),
      last_ip: req.ip,
    })

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: userData.id || email,
        email,
        domain: userData.domain,
        role: userData.role || "user",
        name: userData.name || email.split("@")[0],
        avatar: userData.avatar || null,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Login failed" })
  }
})

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" })
    }

    // Verify refresh token
    const email = await redisClient.get(`refresh_token:${refreshToken}`)
    if (!email) {
      return res.status(401).json({ error: "Invalid refresh token" })
    }

    // Get user data
    const userData = await redisClient.hGetAll(`user:${email}`)
    if (!userData) {
      return res.status(401).json({ error: "User not found" })
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: userData.id || email,
        email,
        domain: userData.domain,
        role: userData.role || "user",
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    )

    res.json({ accessToken })
  } catch (error) {
    console.error("Token refresh error:", error)
    res.status(500).json({ error: "Token refresh failed" })
  }
})

// Logout
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      // Remove refresh token
      await redisClient.del(`refresh_token:${refreshToken}`)
    }

    res.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({ error: "Logout failed" })
  }
})

// Register (for new organizations)
router.post("/register", sensitiveRateLimit, async (req, res) => {
  try {
    const { email, password, organizationName, domain, firstName, lastName } = req.body

    // Validation
    if (!email || !password || !organizationName || !domain) {
      return res.status(400).json({
        error: "Email, password, organization name, and domain required",
      })
    }

    // Check if user already exists
    const existingUser = await redisClient.exists(`user:${email}`)
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" })
    }

    // Check if domain is available
    const existingDomain = await redisClient.exists(`domain:${domain}`)
    if (existingDomain) {
      return res.status(409).json({ error: "Domain already registered" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate organization ID
    const orgId = crypto.randomUUID()
    const userId = crypto.randomUUID()

    // Create organization
    await redisClient.hSet(`organization:${orgId}`, {
      id: orgId,
      name: organizationName,
      domain,
      owner: userId,
      plan: "trial",
      status: "active",
      created: Date.now(),
      trial_ends: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    })

    // Create domain
    await redisClient.hSet(`domain:${domain}`, {
      organization: orgId,
      status: "pending_verification",
      dkim_selector: "default",
      created: Date.now(),
      owner: userId,
    })

    // Create user
    await redisClient.hSet(`user:${email}`, {
      id: userId,
      email,
      password: hashedPassword,
      domain,
      organization: orgId,
      role: "admin",
      name: `${firstName} ${lastName}`.trim(),
      enabled: "true",
      created: Date.now(),
      maildir: `/var/mail/${email}/Maildir`,
    })

    // Add to organization users
    await redisClient.sAdd(`organization:${orgId}:users`, userId)
    await redisClient.sAdd(`domain:${domain}:users`, email)

    res.status(201).json({
      message: "Organization registered successfully",
      organizationId: orgId,
      domain,
      nextSteps: ["Verify domain ownership", "Configure DNS records", "Complete setup wizard"],
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Registration failed" })
  }
})

// Forgot password
router.post("/forgot-password", sensitiveRateLimit, async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email required" })
    }

    // Check if user exists
    const userData = await redisClient.hGetAll(`user:${email}`)
    if (!userData) {
      // Don't reveal if user exists or not
      return res.json({ message: "If the email exists, a reset link has been sent" })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetExpiry = Date.now() + 60 * 60 * 1000 // 1 hour

    // Store reset token
    await redisClient.setEx(
      `password_reset:${resetToken}`,
      60 * 60, // 1 hour
      JSON.stringify({ email, expiry: resetExpiry }),
    )

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(email, resetToken)

    res.json({ message: "If the email exists, a reset link has been sent" })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({ error: "Failed to process request" })
  }
})

// Reset password
router.post("/reset-password", sensitiveRateLimit, async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password required" })
    }

    // Verify reset token
    const resetData = await redisClient.get(`password_reset:${token}`)
    if (!resetData) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    const { email, expiry } = JSON.parse(resetData)

    if (Date.now() > expiry) {
      await redisClient.del(`password_reset:${token}`)
      return res.status(400).json({ error: "Reset token expired" })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await redisClient.hSet(`user:${email}`, {
      password: hashedPassword,
      password_changed: Date.now(),
    })

    // Remove reset token
    await redisClient.del(`password_reset:${token}`)

    res.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ error: "Password reset failed" })
  }
})

// Change password
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const email = req.user.email

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password required" })
    }

    // Get current password hash
    const userData = await redisClient.hGetAll(`user:${email}`)
    if (!userData || !userData.password) {
      return res.status(404).json({ error: "User not found" })
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userData.password)
    if (!validPassword) {
      return res.status(400).json({ error: "Current password incorrect" })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await redisClient.hSet(`user:${email}`, {
      password: hashedPassword,
      password_changed: Date.now(),
    })

    res.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({ error: "Password change failed" })
  }
})

// Get current user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email
    const userData = await redisClient.hGetAll(`user:${email}`)

    if (!userData) {
      return res.status(404).json({ error: "User not found" })
    }

    // Remove sensitive data
    delete userData.password

    res.json({
      id: userData.id,
      email,
      domain: userData.domain,
      role: userData.role,
      name: userData.name,
      avatar: userData.avatar,
      organization: userData.organization,
      created: new Date(Number.parseInt(userData.created || 0)),
      lastLogin: userData.last_login ? new Date(Number.parseInt(userData.last_login)) : null,
      enabled: userData.enabled !== "false",
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ error: "Failed to fetch profile" })
  }
})

// Update profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email
    const { name, avatar, timezone, language } = req.body

    const updateData = {
      updated: Date.now(),
    }

    if (name) updateData.name = name
    if (avatar) updateData.avatar = avatar
    if (timezone) updateData.timezone = timezone
    if (language) updateData.language = language

    await redisClient.hSet(`user:${email}`, updateData)

    res.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Profile update error:", error)
    res.status(500).json({ error: "Profile update failed" })
  }
})

// Two-factor authentication setup
router.post("/2fa/setup", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email
    const speakeasy = require("speakeasy")

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `DITMail (${email})`,
      issuer: "DITMail",
    })

    // Store temporary secret
    await redisClient.setEx(
      `2fa_setup:${email}`,
      300, // 5 minutes
      JSON.stringify({
        secret: secret.base32,
        qr: secret.otpauth_url,
      }),
    )

    res.json({
      secret: secret.base32,
      qrCode: secret.otpauth_url,
      manualEntryKey: secret.base32,
    })
  } catch (error) {
    console.error("2FA setup error:", error)
    res.status(500).json({ error: "2FA setup failed" })
  }
})

// Verify and enable 2FA
router.post("/2fa/verify", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: "Verification token required" })
    }

    // Get temporary secret
    const setupData = await redisClient.get(`2fa_setup:${email}`)
    if (!setupData) {
      return res.status(400).json({ error: "2FA setup not found or expired" })
    }

    const { secret } = JSON.parse(setupData)
    const speakeasy = require("speakeasy")

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 2,
    })

    if (!verified) {
      return res.status(400).json({ error: "Invalid verification token" })
    }

    // Enable 2FA for user
    await redisClient.hSet(`user:${email}`, {
      "2fa_enabled": "true",
      "2fa_secret": secret,
      "2fa_enabled_at": Date.now(),
    })

    // Remove temporary setup data
    await redisClient.del(`2fa_setup:${email}`)

    // Generate backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString("hex").toUpperCase())
    }

    await redisClient.hSet(`user:${email}`, "2fa_backup_codes", JSON.stringify(backupCodes))

    res.json({
      message: "2FA enabled successfully",
      backupCodes,
    })
  } catch (error) {
    console.error("2FA verification error:", error)
    res.status(500).json({ error: "2FA verification failed" })
  }
})

// Disable 2FA
router.post("/2fa/disable", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: "Password required to disable 2FA" })
    }

    // Verify password
    const userData = await redisClient.hGetAll(`user:${email}`)
    const validPassword = await bcrypt.compare(password, userData.password)
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid password" })
    }

    // Disable 2FA
    await redisClient.hDel(`user:${email}`, "2fa_enabled", "2fa_secret", "2fa_backup_codes")

    res.json({ message: "2FA disabled successfully" })
  } catch (error) {
    console.error("2FA disable error:", error)
    res.status(500).json({ error: "Failed to disable 2FA" })
  }
})

module.exports = router
