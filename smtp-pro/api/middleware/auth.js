// Authentication Middleware
const jwt = require("jsonwebtoken")
const redis = require("redis")

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
})

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" })
    }
    req.user = user
    next()
  })
}

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" })
  }
  next()
}

// Check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin access required" })
  }
  next()
}

// Check domain ownership
const checkDomainOwnership = async (req, res, next) => {
  try {
    const { domain } = req.params
    const userId = req.user.id

    // Check if user owns the domain or is admin
    if (req.user.role === "admin" || req.user.role === "super_admin") {
      return next()
    }

    const domainOwner = await redisClient.hGet(`domain:${domain}`, "owner")
    if (domainOwner !== userId) {
      return res.status(403).json({ error: "Domain access denied" })
    }

    next()
  } catch (error) {
    res.status(500).json({ error: "Failed to verify domain ownership" })
  }
}

// Rate limiting for sensitive operations
const sensitiveRateLimit = require("express-rate-limit")({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many sensitive operations, please try again later",
})

module.exports = {
  authenticateToken,
  requireAdmin,
  requireSuperAdmin,
  checkDomainOwnership,
  sensitiveRateLimit,
}
