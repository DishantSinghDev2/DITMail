// Customer Domain Management Plugin
const dns = require("dns").promises
const redis = require("redis")
const config = require("../config/domains")

let redisClient

exports.register = function () {
  this.loginfo("Initializing DITMail Customer Domains Plugin")

  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  this.register_hook("rcpt", "check_customer_domain")
  this.register_hook("mail", "validate_sender_domain")
}

exports.check_customer_domain = function (next, connection, params) {
  const rcpt = params[0]
  const domain = rcpt.host.toLowerCase()

  // Check if this is a customer domain
  this.is_customer_domain(domain, (err, isCustomer) => {
    if (err) {
      this.logerror("Domain check error: " + err)
      return next(DENYSOFT, "Temporary failure")
    }

    if (isCustomer) {
      connection.notes.customer_domain = domain
      connection.notes.local_delivery = true
      this.loginfo(`Accepting mail for customer domain: ${domain}`)
      return next()
    }

    // Check if authenticated user can relay
    if (connection.notes.authenticated) {
      this.loginfo(`Allowing relay for authenticated user to: ${domain}`)
      return next()
    }

    // Reject if not a customer domain and not authenticated
    return next(DENY, `Relay not permitted for domain: ${domain}`)
  })
}

exports.validate_sender_domain = function (next, connection, params) {
  const mail_from = params[0]
  if (!mail_from.host) return next()

  const domain = mail_from.host.toLowerCase()

  // If authenticated, verify sender domain matches user's domain or is allowed
  if (connection.notes.authenticated) {
    const user_domain = connection.notes.auth_user.domain

    // Allow sending from user's domain or any customer domain they have access to
    this.user_can_send_from_domain(connection.notes.auth_user, domain, (err, allowed) => {
      if (err) {
        this.logerror("Sender domain validation error: " + err)
        return next(DENYSOFT, "Temporary failure")
      }

      if (!allowed) {
        return next(DENY, `Not authorized to send from domain: ${domain}`)
      }

      next()
    })
  } else {
    next()
  }
}

exports.is_customer_domain = (domain, callback) => {
  const domainKey = `domain:${domain}`

  redisClient.exists(domainKey, (err, exists) => {
    if (err) return callback(err)

    if (exists) {
      redisClient.hget(domainKey, "status", (err, status) => {
        if (err) return callback(err)
        callback(null, status === "active" || status === "verified")
      })
    } else {
      callback(null, false)
    }
  })
}

exports.user_can_send_from_domain = (user, domain, callback) => {
  // Check if user's domain matches
  if (user.domain === domain) {
    return callback(null, true)
  }

  // Check if user has access to this domain through organization
  if (user.organization) {
    redisClient.sismember(`organization:${user.organization}:domains`, domain, (err, isMember) => {
      if (err) return callback(err)
      callback(null, isMember === 1)
    })
  } else {
    callback(null, false)
  }
}

const DENYSOFT = "DENYSOFT"
const DENY = "DENY"
