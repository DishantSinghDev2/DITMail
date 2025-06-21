// DITMail Routing Plugin (replaces rcpt_to.routes)
const redis = require("redis")

let redisClient

exports.register = function () {
  this.loginfo("Initializing DITMail Routing Plugin")

  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  redisClient.connect().catch((err) => {
    this.logerror("Failed to connect to Redis: " + err)
  })

  this.register_hook("rcpt", "determine_route")
}

exports.determine_route = function (next, connection, params) {
  const rcpt = params[0]
  const domain = rcpt.host.toLowerCase()
  const email = rcpt.address().toLowerCase()

  this.logdebug(`Determining route for ${email}`)

  // Check if this is a local/customer domain
  this.is_local_domain(domain, (err, isLocal) => {
    if (err) {
      this.logerror(`Routing error for ${domain}: ${err}`)
      return next(DENYSOFT, "Temporary routing failure")
    }

    if (isLocal) {
      // Local delivery
      connection.notes.local_delivery = true
      connection.notes.delivery_route = "local"
      this.loginfo(`Local delivery route for ${email}`)
      return next()
    }

    // Check if authenticated user can relay
    if (connection.notes.authenticated) {
      connection.notes.delivery_route = "relay"
      this.loginfo(`Relay route for ${email} (authenticated)`)
      return next()
    }

    // Check if this is from a trusted network
    if (this.is_trusted_network(connection.remote.ip)) {
      connection.notes.delivery_route = "relay"
      this.loginfo(`Relay route for ${email} (trusted network)`)
      return next()
    }

    // Reject - not local and not authorized to relay
    this.loginfo(`Rejecting ${email} - not local domain and not authorized to relay`)
    return next(DENY, `Relay not permitted for ${domain}`)
  })
}

exports.is_local_domain = async (domain, callback) => {
  try {
    if (!redisClient.isOpen) {
      return callback(new Error("Redis connection not available"))
    }

    // Check if domain exists in our customer domains
    const domainData = await redisClient.hGetAll(`domain:${domain}`)
    if (domainData && domainData.status) {
      const isActive = ["active", "verified", "pending_verification"].includes(domainData.status)
      return callback(null, isActive)
    }

    // Check static local domains file
    const localDomains = this.get_local_domains()
    const isLocal = localDomains.includes(domain)
    callback(null, isLocal)
  } catch (error) {
    callback(error)
  }
}

exports.get_local_domains = function () {
  // Default local domains
  const defaultDomains = ["localhost", "mail.freecustom.email", "smtp.freecustom.email", "freecustom.email"]

  try {
    const fs = require("fs")
    const localDomainsFile = "config/local_domains"

    if (fs.existsSync(localDomainsFile)) {
      const content = fs.readFileSync(localDomainsFile, "utf8")
      const fileDomains = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))

      return [...defaultDomains, ...fileDomains]
    }
  } catch (error) {
    this.logerror("Error reading local domains file: " + error)
  }

  return defaultDomains
}

exports.is_trusted_network = function (ip) {
  // Define trusted networks (RFC 1918 private networks + localhost)
  const trustedNetworks = [
    "127.0.0.0/8", // Localhost
    "10.0.0.0/8", // Private Class A
    "172.16.0.0/12", // Private Class B
    "192.168.0.0/16", // Private Class C
  ]

  for (const network of trustedNetworks) {
    if (this.ip_in_network(ip, network)) {
      return true
    }
  }

  return false
}

exports.ip_in_network = function (ip, network) {
  if (!network.includes("/")) {
    return ip === network
  }

  const [networkAddr, prefixLength] = network.split("/")
  const prefix = Number.parseInt(prefixLength)

  // Convert IPs to integers for comparison
  const ipInt = this.ip_to_int(ip)
  const networkInt = this.ip_to_int(networkAddr)
  const mask = (0xffffffff << (32 - prefix)) >>> 0

  return (ipInt & mask) === (networkInt & mask)
}

exports.ip_to_int = (ip) => {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number.parseInt(octet), 0) >>> 0
}

const DENY = "DENY"
const DENYSOFT = "DENYSOFT"
