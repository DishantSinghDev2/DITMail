// DITMail Domain Management Plugin
const dns = require("dns").promises
const redis = require("redis")

let redisClient

exports.register = function () {
  this.loginfo("Initializing DITMail Domain Management")

  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  this.register_hook("rcpt", "check_domain")
  this.register_hook("mail", "validate_sender_domain")
}

exports.check_domain = function (next, connection, params) {
  const rcpt = params[0]
  const domain = rcpt.host.toLowerCase()

  this.is_managed_domain(domain, (err, managed) => {
    if (err) {
      this.logerror("Domain check error: " + err)
      return next(DENYSOFT, "Temporary failure")
    }

    if (managed) {
      connection.notes.local_domain = domain
      return next()
    }

    // Check if we should relay
    if (connection.notes.authenticated) {
      return next()
    }

    return next(DENY, "Relay not permitted")
  })
}

exports.validate_sender_domain = (next, connection, params) => {
  const mail_from = params[0]
  if (!mail_from.host) return next()

  const domain = mail_from.host.toLowerCase()

  // If authenticated, verify sender domain matches user domain
  if (connection.notes.authenticated) {
    const user_domain = connection.notes.auth_user.domain
    if (domain !== user_domain) {
      return next(DENY, "Sender domain mismatch")
    }
  }

  next()
}

exports.is_managed_domain = (domain, callback) => {
  const domainKey = `domain:${domain}`

  redisClient.exists(domainKey, (err, exists) => {
    if (err) return callback(err)

    if (exists) {
      redisClient.hget(domainKey, "status", (err, status) => {
        if (err) return callback(err)
        callback(null, status === "active")
      })
    } else {
      callback(null, false)
    }
  })
}

exports.get_domain_config = (domain, callback) => {
  const domainKey = `domain:${domain}`

  redisClient.hgetall(domainKey, (err, config) => {
    if (err) return callback(err)
    callback(null, config)
  })
}

const DENYSOFT = "DENYSOFT"
const DENY = "DENY"
