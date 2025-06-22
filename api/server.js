// DITMail API Server
const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const compression = require("compression")
const morgan = require("morgan")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Import route modules
const authRoutes = require("./routes/auth")
const domainRoutes = require("./routes/domains")
const userRoutes = require("./routes/users")
const emailRoutes = require("./routes/emails")
const contactRoutes = require("./routes/contacts")
const calendarRoutes = require("./routes/calendar")
const fileRoutes = require("./routes/files")
const organizationRoutes = require("./routes/organization")
const billingRoutes = require("./routes/billing")
const settingsRoutes = require("./routes/settings")
const reportsRoutes = require("./routes/reports")
const securityRoutes = require("./routes/security")
const adminRoutes = require("./routes/admin")
const webhookRoutes = require("./routes/webhooks")

// Middleware
app.use(helmet())
app.use(compression())
app.use(morgan("combined"))
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP",
})
app.use(limiter)

// Body parsing
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/domains", domainRoutes)
app.use("/api/users", userRoutes)
app.use("/api/emails", emailRoutes)
app.use("/api/contacts", contactRoutes)
app.use("/api/calendar", calendarRoutes)
app.use("/api/files", fileRoutes)
app.use("/api/organization", organizationRoutes)
app.use("/api/billing", billingRoutes)
app.use("/api/settings", settingsRoutes)
app.use("/api/reports", reportsRoutes)
app.use("/api/security", securityRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/webhooks", webhookRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  })
})

// API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "DITMail API",
    version: "1.0.0",
    description: "Enterprise Email Service API",
    endpoints: {
      auth: "/api/auth",
      domains: "/api/domains",
      users: "/api/users",
      emails: "/api/emails",
      contacts: "/api/contacts",
      calendar: "/api/calendar",
      files: "/api/files",
      organization: "/api/organization",
      billing: "/api/billing",
      settings: "/api/settings",
      reports: "/api/reports",
      security: "/api/security",
      admin: "/api/admin",
      webhooks: "/api/webhooks",
    },
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" })
})

// Start server
app.listen(PORT, () => {
  console.log(`DITMail API Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
})

module.exports = app
