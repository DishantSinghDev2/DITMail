// DITMail User Management Plugin
const redis = require("redis")

let redisClient

exports.register = function () {
  this.loginfo("Initializing DITMail User Management Plugin")

  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  redisClient.connect().catch((err) => {
    this.logerror("Failed to connect to Redis: " + err)
  })

  this.register_hook("rcpt", "check_user_exists")
  this.register_hook("mail", "check_sender_quota")
  this.register_hook("data_post", "update_user_stats")
}

exports.check_user_exists = function (next, connection, params) {
  const rcpt = params[0]
  const email = rcpt.address().toLowerCase()

  // Only check for local domains
  if (!connection.notes.customer_domain && !connection.notes.local_domain) {
    return next()
  }

  this.user_exists(email, (err, exists, userData) => {
    if (err) {
      this.logerror(`User check error for ${email}: ${err}`)
      return next(DENYSOFT, "Temporary failure")
    }

    if (!exists) {
      this.loginfo(`User not found: ${email}`)
      return next(DENY, `User ${email} does not exist`)
    }

    // Check if user is enabled
    if (userData.enabled === "false") {
      this.loginfo(`User disabled: ${email}`)
      return next(DENY, `User ${email} is disabled`)
    }

    // Store user data for later use
    connection.notes.rcpt_user_data = userData
    this.logdebug(`User ${email} exists and is enabled`)
    next()
  })
}

exports.check_sender_quota = function (next, connection, params) {
  const mail_from = params[0]
  if (!mail_from || !mail_from.host) return next()

  // Only check quota for authenticated users
  if (!connection.notes.authenticated || !connection.notes.auth_user) {
    return next()
  }

  const userEmail = connection.notes.auth_user.username
  this.check_user_quota(userEmail, (err, quotaOk, quotaInfo) => {
    if (err) {
      this.logerror(`Quota check error for ${userEmail}: ${err}`)
      return next(DENYSOFT, "Temporary failure")
    }

    if (!quotaOk) {
      this.loginfo(`Quota exceeded for ${userEmail}: ${quotaInfo.used}/${quotaInfo.limit}`)
      return next(DENY, "Quota exceeded")
    }

    connection.notes.sender_quota = quotaInfo
    next()
  })
}

exports.update_user_stats = function (next, connection) {
  const transaction = connection.transaction
  if (!transaction) return next()

  // Update stats for authenticated sender
  if (connection.notes.authenticated && connection.notes.auth_user) {
    const userEmail = connection.notes.auth_user.username
    const messageSize = transaction.data_bytes || 0

    this.update_sender_stats(userEmail, messageSize, (err) => {
      if (err) {
        this.logerror(`Failed to update sender stats for ${userEmail}: ${err}`)
      }
    })
  }

  // Update stats for recipients
  if (connection.notes.rcpt_user_data) {
    const messageSize = transaction.data_bytes || 0
    const recipients = transaction.rcpt_to.map((rcpt) => rcpt.address().toLowerCase())

    for (const recipient of recipients) {
      this.update_recipient_stats(recipient, messageSize, (err) => {
        if (err) {
          this.logerror(`Failed to update recipient stats for ${recipient}: ${err}`)
        }
      })
    }
  }

  next()
}

exports.user_exists = async (email, callback) => {
  try {
    if (!redisClient.isOpen) {
      return callback(new Error("Redis connection not available"))
    }

    const userData = await redisClient.hGetAll(`user:${email}`)
    if (!userData || !userData.email) {
      return callback(null, false, null)
    }

    callback(null, true, userData)
  } catch (error) {
    callback(error)
  }
}

exports.check_user_quota = async function (email, callback) {
  try {
    if (!redisClient.isOpen) {
      return callback(new Error("Redis connection not available"))
    }

    const userData = await redisClient.hGetAll(`user:${email}`)
    const statsData = await redisClient.hGetAll(`stats:${email}`)

    if (!userData || !userData.quota) {
      return callback(null, true, { used: 0, limit: "unlimited" })
    }

    const quotaLimit = this.parse_quota(userData.quota)
    const quotaUsed = Number.parseInt(statsData.bytes_sent_today || 0)

    const quotaOk = quotaLimit === 0 || quotaUsed < quotaLimit

    callback(null, quotaOk, {
      used: quotaUsed,
      limit: quotaLimit === 0 ? "unlimited" : quotaLimit,
      percentage: quotaLimit === 0 ? 0 : Math.round((quotaUsed / quotaLimit) * 100),
    })
  } catch (error) {
    callback(error)
  }
}

exports.parse_quota = (quotaString) => {
  if (!quotaString || quotaString === "unlimited") return 0

  const match = quotaString.match(/^(\d+(?:\.\d+)?)\s*(GB|MB|KB|B)?$/i)
  if (!match) return 0

  const value = Number.parseFloat(match[1])
  const unit = (match[2] || "B").toUpperCase()

  const multipliers = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }

  return Math.floor(value * (multipliers[unit] || 1))
}

exports.update_sender_stats = async (email, messageSize, callback) => {
  try {
    if (!redisClient.isOpen) {
      return callback(new Error("Redis connection not available"))
    }

    const today = new Date().toISOString().split("T")[0]
    const statsKey = `stats:${email}`

    await redisClient
      .multi()
      .hIncrBy(statsKey, "messages_sent", 1)
      .hIncrBy(statsKey, "bytes_sent", messageSize)
      .hIncrBy(statsKey, `messages_sent_${today}`, 1)
      .hIncrBy(statsKey, `bytes_sent_${today}`, messageSize)
      .hSet(statsKey, "last_sent", Date.now())
      .exec()

    callback(null)
  } catch (error) {
    callback(error)
  }
}

exports.update_recipient_stats = async (email, messageSize, callback) => {
  try {
    if (!redisClient.isOpen) {
      return callback(new Error("Redis connection not available"))
    }

    const today = new Date().toISOString().split("T")[0]
    const statsKey = `stats:${email}`

    await redisClient
      .multi()
      .hIncrBy(statsKey, "messages_received", 1)
      .hIncrBy(statsKey, "bytes_received", messageSize)
      .hIncrBy(statsKey, `messages_received_${today}`, 1)
      .hIncrBy(statsKey, `bytes_received_${today}`, messageSize)
      .hSet(statsKey, "last_received", Date.now())
      .exec()

    callback(null)
  } catch (error) {
    callback(error)
  }
}

const DENY = "DENY"
const DENYSOFT = "DENYSOFT"
