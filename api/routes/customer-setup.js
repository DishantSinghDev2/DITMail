// Customer Domain Setup Routes
const express = require("express")
const redis = require("redis")
const config = require("../../config/domains")
const { authenticateToken, requireAdmin } = require("../middleware/auth")

const router = express.Router()

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
})

// Get server configuration for customers
router.get("/server-config", async (req, res) => {
  try {
    const serverConfig = {
      mailServer: config.server.hostname,
      smtpServer: config.server.smtp_hostname,
      ports: config.server.ports,
      instructions: {
        mx: `Add this MX record to your domain: "10 ${config.server.hostname}"`,
        smtp: `Use these SMTP settings: Server: ${config.server.smtp_hostname}, Port: 587 (STARTTLS) or 465 (SSL)`,
        imap: `Use these IMAP settings: Server: ${config.server.hostname}, Port: 993 (SSL)`,
      },
    }

    res.json(serverConfig)
  } catch (error) {
    console.error("Get server config error:", error)
    res.status(500).json({ error: "Failed to get server configuration" })
  }
})

// Get DNS setup instructions for customer domain
router.get("/dns-setup/:domain", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params

    // Verify domain ownership
    const domainData = await redisClient.hGetAll(`domain:${domain}`)
    if (!domainData) {
      return res.status(404).json({ error: "Domain not found" })
    }

    // Check permissions
    if (req.user.role !== "super_admin" && domainData.organization !== req.user.organization) {
      return res.status(403).json({ error: "Access denied" })
    }

    const dnsRecords = config.getDNSRecords(domain)
    const smtpConfig = config.getSmtpConfig(domain)

    res.json({
      domain,
      serverHostname: config.server.hostname,
      dnsRecords,
      smtpConfig,
      instructions: {
        step1: "Add the MX record to point your domain to our mail server",
        step2: "Add the SPF record to authorize our server to send emails",
        step3: "Add the DMARC record for email authentication policy",
        step4: "Configure your email client with the provided SMTP/IMAP settings",
        step5: "Test email sending and receiving",
      },
      testCommands: {
        mx: `dig MX ${domain}`,
        spf: `dig TXT ${domain}`,
        smtp: `telnet ${config.server.smtp_hostname} 587`,
      },
    })
  } catch (error) {
    console.error("Get DNS setup error:", error)
    res.status(500).json({ error: "Failed to get DNS setup instructions" })
  }
})

// Verify customer domain DNS setup
router.post("/verify-dns/:domain", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params
    const dns = require("dns").promises

    // Verify domain ownership
    const domainData = await redisClient.hGetAll(`domain:${domain}`)
    if (!domainData) {
      return res.status(404).json({ error: "Domain not found" })
    }

    const verification = {
      mx: false,
      spf: false,
      dmarc: false,
      errors: [],
    }

    try {
      // Check MX record
      const mxRecords = await dns.resolveMx(domain)
      verification.mx = mxRecords.some((record) =>
        record.exchange.toLowerCase().includes(config.server.hostname.toLowerCase()),
      )
      if (!verification.mx) {
        verification.errors.push(`MX record should point to ${config.server.hostname}`)
      }
    } catch (error) {
      verification.errors.push(`MX record check failed: ${error.message}`)
    }

    try {
      // Check SPF record
      const txtRecords = await dns.resolveTxt(domain)
      const spfRecord = txtRecords.find(
        (record) => record.join("").includes("v=spf1") && record.join("").includes(config.server.hostname),
      )
      verification.spf = !!spfRecord
      if (!verification.spf) {
        verification.errors.push(`SPF record should include ${config.server.hostname}`)
      }
    } catch (error) {
      verification.errors.push(`SPF record check failed: ${error.message}`)
    }

    try {
      // Check DMARC record
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`)
      verification.dmarc = dmarcRecords.some((record) => record.join("").includes("v=DMARC1"))
      if (!verification.dmarc) {
        verification.errors.push("DMARC record not found or invalid")
      }
    } catch (error) {
      verification.errors.push(`DMARC record check failed: ${error.message}`)
    }

    // Update domain status
    const allVerified = verification.mx && verification.spf && verification.dmarc
    const status = allVerified ? "verified" : "partial_verification"

    await redisClient.hSet(`domain:${domain}`, {
      status,
      dns_verification: JSON.stringify(verification),
      last_dns_check: Date.now(),
    })

    res.json({
      domain,
      status,
      verification,
      message: allVerified ? "Domain DNS fully verified" : "DNS verification incomplete",
    })
  } catch (error) {
    console.error("DNS verification error:", error)
    res.status(500).json({ error: "DNS verification failed" })
  }
})

// Get email client configuration
router.get("/email-config/:domain/:email", authenticateToken, async (req, res) => {
  try {
    const { domain, email } = req.params

    // Verify user access
    if (req.user.email !== email && req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied" })
    }

    const smtpConfig = config.getSmtpConfig(domain)

    // Generate email client configurations
    const configurations = {
      // Outlook/Thunderbird manual setup
      manual: {
        incoming: {
          server: config.server.hostname,
          port: 993,
          security: "SSL/TLS",
          username: email,
          authentication: "Normal password",
        },
        outgoing: {
          server: config.server.smtp_hostname,
          port: 587,
          security: "STARTTLS",
          username: email,
          authentication: "Normal password",
        },
      },

      // Apple Mail
      apple: {
        incoming: {
          server: config.server.hostname,
          port: 993,
          security: "SSL",
          username: email,
        },
        outgoing: {
          server: config.server.smtp_hostname,
          port: 587,
          security: "STARTTLS",
          username: email,
        },
      },

      // Android/iOS
      mobile: {
        incoming: {
          server: config.server.hostname,
          port: 993,
          security: "SSL/TLS",
          username: email,
        },
        outgoing: {
          server: config.server.smtp_hostname,
          port: 587,
          security: "STARTTLS",
          username: email,
        },
      },
    }

    res.json({
      email,
      domain,
      configurations,
      testSettings: {
        smtp: `telnet ${config.server.smtp_hostname} 587`,
        imap: `telnet ${config.server.hostname} 993`,
      },
    })
  } catch (error) {
    console.error("Get email config error:", error)
    res.status(500).json({ error: "Failed to get email configuration" })
  }
})

module.exports = router
