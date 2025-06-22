// Domain Management Routes
const express = require("express")
const crypto = require("crypto")
const dns = require("dns").promises
const redis = require("redis")
const { authenticateToken, requireAdmin, checkDomainOwnership } = require("../middleware/auth")

const router = express.Router()

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
})

// Get all domains for user/organization
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { organization } = req.user
    const domains = []

    if (req.user.role === "super_admin") {
      // Super admin can see all domains
      const allDomains = await redisClient.sMembers("domains:all")
      for (const domain of allDomains) {
        const domainData = await redisClient.hGetAll(`domain:${domain}`)
        domains.push({
          name: domain,
          ...domainData,
          created: new Date(Number.parseInt(domainData.created || 0)),
        })
      }
    } else if (organization) {
      // Get domains for organization
      const orgDomains = await redisClient.sMembers(`organization:${organization}:domains`)
      for (const domain of orgDomains) {
        const domainData = await redisClient.hGetAll(`domain:${domain}`)
        const userCount = await redisClient.sCard(`domain:${domain}:users`)
        domains.push({
          name: domain,
          ...domainData,
          userCount,
          created: new Date(Number.parseInt(domainData.created || 0)),
        })
      }
    }

    res.json(domains)
  } catch (error) {
    console.error("Get domains error:", error)
    res.status(500).json({ error: "Failed to fetch domains" })
  }
})

// Get specific domain details
router.get("/:domain", authenticateToken, checkDomainOwnership, async (req, res) => {
  try {
    const { domain } = req.params
    const domainData = await redisClient.hGetAll(`domain:${domain}`)

    if (!domainData) {
      return res.status(404).json({ error: "Domain not found" })
    }

    // Get additional stats
    const userCount = await redisClient.sCard(`domain:${domain}:users`)
    const aliasCount = await redisClient.sCard(`domain:${domain}:aliases`)

    res.json({
      name: domain,
      ...domainData,
      userCount,
      aliasCount,
      created: new Date(Number.parseInt(domainData.created || 0)),
      updated: domainData.updated ? new Date(Number.parseInt(domainData.updated)) : null,
    })
  } catch (error) {
    console.error("Get domain error:", error)
    res.status(500).json({ error: "Failed to fetch domain" })
  }
})

// Add new domain
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { domain, organization } = req.body
    const userId = req.user.id

    if (!domain) {
      return res.status(400).json({ error: "Domain name required" })
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: "Invalid domain format" })
    }

    // Check if domain already exists
    const exists = await redisClient.exists(`domain:${domain}`)
    if (exists) {
      return res.status(409).json({ error: "Domain already exists" })
    }

    const orgId = organization || req.user.organization

    // Create domain
    await redisClient.hSet(`domain:${domain}`, {
      organization: orgId,
      status: "pending_verification",
      dkim_selector: "default",
      spf_record: `v=spf1 mx a:mail.${domain} -all`,
      dmarc_policy: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
      created: Date.now(),
      owner: userId,
    })

    // Add to organization domains
    await redisClient.sAdd(`organization:${orgId}:domains`, domain)
    await redisClient.sAdd("domains:all", domain)

    // Generate DKIM keys (this would typically be done by a background job)
    // TODO: Trigger DKIM key generation

    res.status(201).json({
      message: "Domain added successfully",
      domain,
      status: "pending_verification",
      nextSteps: ["Generate DKIM keys", "Configure DNS records", "Verify domain ownership"],
    })
  } catch (error) {
    console.error("Add domain error:", error)
    res.status(500).json({ error: "Failed to add domain" })
  }
})

// Update domain settings
router.put("/:domain", authenticateToken, checkDomainOwnership, async (req, res) => {
  try {
    const { domain } = req.params
    const { dkim_selector, spf_record, dmarc_policy, max_users, quota_default, features } = req.body

    const updateData = { updated: Date.now() }

    if (dkim_selector) updateData.dkim_selector = dkim_selector
    if (spf_record) updateData.spf_record = spf_record
    if (dmarc_policy) updateData.dmarc_policy = dmarc_policy
    if (max_users) updateData.max_users = max_users
    if (quota_default) updateData.quota_default = quota_default
    if (features) updateData.features = JSON.stringify(features)

    await redisClient.hSet(`domain:${domain}`, updateData)

    res.json({ message: "Domain updated successfully" })
  } catch (error) {
    console.error("Update domain error:", error)
    res.status(500).json({ error: "Failed to update domain" })
  }
})

// Delete domain
router.delete("/:domain", authenticateToken, checkDomainOwnership, async (req, res) => {
  try {
    const { domain } = req.params

    // Check if domain has users
    const userCount = await redisClient.sCard(`domain:${domain}:users`)
    if (userCount > 0) {
      return res.status(400).json({
        error: "Cannot delete domain with existing users",
        userCount,
      })
    }

    // Get domain data for cleanup
    const domainData = await redisClient.hGetAll(`domain:${domain}`)
    const orgId = domainData.organization

    // Remove domain
    await redisClient.del(`domain:${domain}`)
    await redisClient.sRem(`organization:${orgId}:domains`, domain)
    await redisClient.sRem("domains:all", domain)

    // Clean up related data
    await redisClient.del(`domain:${domain}:users`)
    await redisClient.del(`domain:${domain}:aliases`)

    res.json({ message: "Domain deleted successfully" })
  } catch (error) {
    console.error("Delete domain error:", error)
    res.status(500).json({ error: "Failed to delete domain" })
  }
})

// Verify domain ownership
router.post("/:domain/verify", authenticateToken, checkDomainOwnership, async (req, res) => {
  try {
    const { domain } = req.params

    // Check DNS records
    const verificationResults = {
      mx: false,
      spf: false,
      dkim: false,
      dmarc: false,
    }

    try {
      // Check MX record
      const mxRecords = await dns.resolveMx(domain)
      verificationResults.mx = mxRecords.some(
        (record) => record.exchange.includes("mail.") || record.exchange.includes(domain),
      )
    } catch (error) {
      console.log("MX record check failed:", error.message)
    }

    try {
      // Check SPF record
      const txtRecords = await dns.resolveTxt(domain)
      verificationResults.spf = txtRecords.some((record) => record.join("").includes("v=spf1"))
    } catch (error) {
      console.log("SPF record check failed:", error.message)
    }

    try {
      // Check DKIM record
      const dkimRecords = await dns.resolveTxt(`default._domainkey.${domain}`)
      verificationResults.dkim = dkimRecords.some((record) => record.join("").includes("v=DKIM1"))
    } catch (error) {
      console.log("DKIM record check failed:", error.message)
    }

    try {
      // Check DMARC record
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`)
      verificationResults.dmarc = dmarcRecords.some((record) => record.join("").includes("v=DMARC1"))
    } catch (error) {
      console.log("DMARC record check failed:", error.message)
    }

    // Update domain status based on verification
    const allVerified = Object.values(verificationResults).every(Boolean)
    const status = allVerified ? "verified" : "partial_verification"

    await redisClient.hSet(`domain:${domain}`, {
      status,
      verification_results: JSON.stringify(verificationResults),
      last_verified: Date.now(),
    })

    res.json({
      domain,
      status,
      verification: verificationResults,
      message: allVerified ? "Domain fully verified" : "Partial verification completed",
    })
  } catch (error) {
    console.error("Domain verification error:", error)
    res.status(500).json({ error: "Domain verification failed" })
  }
})

// Get DNS records for domain setup
router.get("/:domain/dns-records", authenticateToken, checkDomainOwnership, async (req, res) => {
  try {
    const { domain } = req.params
    const domainData = await redisClient.hGetAll(`domain:${domain}`)

    if (!domainData) {
      return res.status(404).json({ error: "Domain not found" })
    }

    // Get server IP (this should be configured)
    const serverIP = process.env.SERVER_IP || "YOUR_SERVER_IP"

    const dnsRecords = {
      mx: [
        {
          type: "MX",
          name: domain,
          value: `10 mail.${domain}`,
          ttl: 3600,
        },
      ],
      a: [
        {
          type: "A",
          name: `mail.${domain}`,
          value: serverIP,
          ttl: 3600,
        },
      ],
      txt: [
        {
          type: "TXT",
          name: domain,
          value: domainData.spf_record || `v=spf1 mx a:mail.${domain} -all`,
          ttl: 3600,
          purpose: "SPF",
        },
        {
          type: "TXT",
          name: `_dmarc.${domain}`,
          value: domainData.dmarc_policy || `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
          ttl: 3600,
          purpose: "DMARC",
        },
      ],
    }

    // Add DKIM record if available
    const dkimPublicKey = await redisClient.get(`dkim:${domain}:public_key`)
    if (dkimPublicKey) {
      dnsRecords.txt.push({
        type: "TXT",
        name: `${domainData.dkim_selector || "default"}._domainkey.${domain}`,
        value: `v=DKIM1; k=rsa; p=${dkimPublicKey}`,
        ttl: 3600,
        purpose: "DKIM",
      })
    }

    res.json({
      domain,
      records: dnsRecords,
      instructions: {
        mx: "Add MX record to point email to your mail server",
        a: "Add A record for your mail server subdomain",
        spf: "Add SPF record to authorize your mail server",
        dkim: "Add DKIM record for email authentication",
        dmarc: "Add DMARC record for email policy",
      },
    })
  } catch (error) {
    console.error("Get DNS records error:", error)
    res.status(500).json({ error: "Failed to get DNS records" })
  }
})

// Generate DKIM keys
router.post("/:domain/dkim/generate", authenticateToken, checkDomainOwnership, async (req, res) => {
  try {
    const { domain } = req.params
    const { keySize = 2048, selector = "default" } = req.body

    // Generate RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: keySize,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    })

    // Extract public key for DNS record
    const publicKeyData = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\n/g, "")

    // Store keys
    await redisClient.setEx(`dkim:${domain}:private_key`, 365 * 24 * 60 * 60, privateKey)
    await redisClient.setEx(`dkim:${domain}:public_key`, 365 * 24 * 60 * 60, publicKeyData)

    // Update domain with DKIM info
    await redisClient.hSet(`domain:${domain}`, {
      dkim_selector: selector,
      dkim_generated: Date.now(),
    })

    res.json({
      message: "DKIM keys generated successfully",
      selector,
      publicKey: publicKeyData,
      dnsRecord: {
        name: `${selector}._domainkey.${domain}`,
        type: "TXT",
        value: `v=DKIM1; k=rsa; p=${publicKeyData}`,
      },
    })
  } catch (error) {
    console.error("DKIM generation error:", error)
    res.status(500).json({ error: "Failed to generate DKIM keys" })
  }
})

// Get domain statistics
router.get("/:domain/stats", authenticateToken, checkDomainOwnership, async (req, res) => {
  try {
    const { domain } = req.params
    const { period = "7d" } = req.query

    // Get basic counts
    const userCount = await redisClient.sCard(`domain:${domain}:users`)
    const aliasCount = await redisClient.sCard(`domain:${domain}:aliases`)

    // Get email statistics (this would typically come from a time-series database)
    const stats = {
      users: userCount,
      aliases: aliasCount,
      emailsSent: 0,
      emailsReceived: 0,
      storageUsed: "0 MB",
      quotaUsed: "0%",
    }

    // TODO: Implement actual statistics gathering from logs/metrics

    res.json({
      domain,
      period,
      stats,
      lastUpdated: new Date(),
    })
  } catch (error) {
    console.error("Domain stats error:", error)
    res.status(500).json({ error: "Failed to get domain statistics" })
  }
})

module.exports = router
