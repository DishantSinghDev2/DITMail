// DITMail SPF (Sender Policy Framework) Plugin
const dns = require("dns").promises
const redis = require("redis")

let redisClient

exports.register = function () {
  this.loginfo("Initializing DITMail SPF Plugin")

  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  redisClient.on("error", (err) => {
    this.logerror("Redis connection error: " + err)
  })

  redisClient.connect().catch((err) => {
    this.logerror("Failed to connect to Redis: " + err)
  })

  this.register_hook("mail", "check_spf")
  this.register_hook("data_post", "add_spf_headers")
}

exports.check_spf = function (next, connection, params) {
  const mail_from = params[0]
  if (!mail_from || !mail_from.host) {
    return next()
  }

  const domain = mail_from.host.toLowerCase()
  const ip = connection.remote.ip

  this.logdebug(`Checking SPF for ${domain} from IP ${ip}`)

  this.check_spf_record(domain, ip, (err, result) => {
    if (err) {
      this.logerror(`SPF check error for ${domain}: ${err}`)
      connection.notes.spf_result = "temperror"
      return next()
    }

    connection.notes.spf_result = result.result
    connection.notes.spf_explanation = result.explanation

    this.loginfo(`SPF result for ${domain}: ${result.result}`)

    // Handle SPF results based on policy
    switch (result.result) {
      case "fail":
        if (this.config.get("spf.reject_fail")) {
          return next(DENY, `SPF check failed for ${domain}`)
        }
        break
      case "softfail":
        // Usually just log, don't reject
        break
      case "pass":
        connection.notes.spf_pass = true
        break
    }

    next()
  })
}

exports.check_spf_record = async function (domain, ip, callback) {
  try {
    // Check cache first
    const cacheKey = `spf:${domain}:${ip}`
    if (redisClient.isOpen) {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return callback(null, JSON.parse(cached))
      }
    }

    // Get SPF record
    const txtRecords = await dns.resolveTxt(domain)
    let spfRecord = null

    for (const record of txtRecords) {
      const recordText = record.join("")
      if (recordText.startsWith("v=spf1")) {
        spfRecord = recordText
        break
      }
    }

    if (!spfRecord) {
      const result = { result: "none", explanation: "No SPF record found" }
      this.cache_spf_result(cacheKey, result)
      return callback(null, result)
    }

    // Parse SPF record
    const spfResult = this.parse_spf_record(spfRecord, domain, ip)
    this.cache_spf_result(cacheKey, spfResult)
    callback(null, spfResult)
  } catch (error) {
    callback(error)
  }
}

exports.parse_spf_record = function (spfRecord, domain, ip) {
  const mechanisms = spfRecord.split(/\s+/).slice(1) // Remove 'v=spf1'

  for (const mechanism of mechanisms) {
    const result = this.evaluate_mechanism(mechanism, domain, ip)
    if (result !== "neutral") {
      return {
        result: result,
        explanation: `SPF ${result} for mechanism: ${mechanism}`,
      }
    }
  }

  // Default result if no mechanisms match
  return { result: "neutral", explanation: "No matching SPF mechanisms" }
}

exports.evaluate_mechanism = function (mechanism, domain, ip) {
  // Handle qualifiers (+, -, ~, ?)
  let qualifier = "+"
  if (["+", "-", "~", "?"].includes(mechanism[0])) {
    qualifier = mechanism[0]
    mechanism = mechanism.slice(1)
  }

  let match = false

  if (mechanism === "all") {
    match = true
  } else if (mechanism.startsWith("ip4:")) {
    const ipRange = mechanism.slice(4)
    match = this.ip_in_range(ip, ipRange)
  } else if (mechanism.startsWith("ip6:")) {
    // IPv6 support (simplified)
    match = false
  } else if (mechanism === "a" || mechanism.startsWith("a:")) {
    // Would need DNS lookup - simplified for now
    match = false
  } else if (mechanism === "mx" || mechanism.startsWith("mx:")) {
    // Would need MX lookup - simplified for now
    match = false
  } else if (mechanism.startsWith("include:")) {
    // Would need recursive SPF check - simplified for now
    match = false
  }

  if (match) {
    switch (qualifier) {
      case "+":
        return "pass"
      case "-":
        return "fail"
      case "~":
        return "softfail"
      case "?":
        return "neutral"
    }
  }

  return "neutral"
}

exports.ip_in_range = function (ip, range) {
  // Simple IP range check (IPv4 only)
  if (!range.includes("/")) {
    return ip === range
  }

  const [network, prefixLength] = range.split("/")
  const prefix = Number.parseInt(prefixLength)

  // Convert IPs to integers for comparison
  const ipInt = this.ip_to_int(ip)
  const networkInt = this.ip_to_int(network)
  const mask = (0xffffffff << (32 - prefix)) >>> 0

  return (ipInt & mask) === (networkInt & mask)
}

exports.ip_to_int = (ip) => ip.split(".").reduce((acc, octet) => (acc << 8) + Number.parseInt(octet), 0) >>> 0

exports.cache_spf_result = async function (key, result) {
  if (redisClient.isOpen) {
    try {
      await redisClient.setEx(key, 3600, JSON.stringify(result)) // Cache for 1 hour
    } catch (error) {
      this.logerror("Failed to cache SPF result: " + error)
    }
  }
}

exports.add_spf_headers = (next, connection) => {
  if (connection.notes.spf_result) {
    const header = `Received-SPF: ${connection.notes.spf_result} (${connection.notes.spf_explanation || ""})`
    connection.transaction.add_header("Received-SPF", header)
  }
  next()
}

const DENY = "DENY"
