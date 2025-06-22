// DITMail Authentication Plugin
const crypto = require("crypto")
const bcrypt = require("bcrypt")
const redis = require("redis")

let redisClient

const DENY = "DENY"
const OK = "OK"

exports.register = function () {
  this.loginfo("Initializing DITMail Authentication")

  // Initialize Redis connection
  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  redisClient.on("error", (err) => {
    this.logerror("Redis connection error: " + err)
  })

  // Register hooks
  this.register_hook("capabilities", "advertise_auth")
  this.register_hook("unrecognized_command", "auth_command")
  this.register_hook("mail", "check_auth")
  this.register_hook("rcpt", "check_auth")
}

exports.advertise_auth = (next, connection) => {
  if (connection.using_tls || connection.local.port === 587) {
    connection.capabilities.push("AUTH PLAIN LOGIN")
    connection.notes.auth_advertised = true
  }
  next()
}

exports.auth_command = function (next, connection, params) {
  if (params[0].toUpperCase() !== "AUTH") return next()

  const method = params[1] ? params[1].toUpperCase() : ""
  const credentials = params[2] || ""

  switch (method) {
    case "PLAIN":
      return this.auth_plain(next, connection, credentials)
    case "LOGIN":
      return this.auth_login(next, connection, credentials)
    default:
      connection.respond(504, "AUTH method not supported")
      return next(DENY)
  }
}

exports.auth_plain = function (next, connection, credentials) {
  if (!credentials) {
    connection.respond(334, "")
    connection.notes.auth_method = "PLAIN"
    connection.notes.auth_step = 1
    return next(OK)
  }

  this.verify_plain_auth(connection, credentials, (err, user) => {
    if (err || !user) {
      connection.respond(535, "Authentication failed")
      return next(DENY)
    }

    connection.notes.auth_user = user
    connection.notes.authenticated = true
    connection.respond(235, "Authentication successful")
    next(OK)
  })
}

exports.auth_login = function (next, connection, credentials) {
  if (!connection.notes.auth_step) {
    connection.respond(334, Buffer.from("Username:").toString("base64"))
    connection.notes.auth_method = "LOGIN"
    connection.notes.auth_step = 1
    return next(OK)
  }

  if (connection.notes.auth_step === 1) {
    connection.notes.auth_username = Buffer.from(credentials, "base64").toString()
    connection.respond(334, Buffer.from("Password:").toString("base64"))
    connection.notes.auth_step = 2
    return next(OK)
  }

  if (connection.notes.auth_step === 2) {
    const password = Buffer.from(credentials, "base64").toString()
    this.verify_login_auth(connection, connection.notes.auth_username, password, (err, user) => {
      if (err || !user) {
        connection.respond(535, "Authentication failed")
        return next(DENY)
      }

      connection.notes.auth_user = user
      connection.notes.authenticated = true
      connection.respond(235, "Authentication successful")
      next(OK)
    })
  }
}

exports.verify_plain_auth = function (connection, credentials, callback) {
  try {
    const decoded = Buffer.from(credentials, "base64").toString()
    const parts = decoded.split("\0")
    const username = parts[1]
    const password = parts[2]

    this.verify_credentials(username, password, callback)
  } catch (err) {
    callback(err)
  }
}

exports.verify_login_auth = function (connection, username, password, callback) {
  this.verify_credentials(username, password, callback)
}

exports.verify_credentials = (username, password, callback) => {
  const userKey = `user:${username}`

  redisClient.hgetall(userKey, (err, user) => {
    if (err) return callback(err)
    if (!user || !user.password) return callback(null, false)

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return callback(err)
      if (!match) return callback(null, false)

      // Update last login
      redisClient.hset(userKey, "last_login", Date.now())

      callback(null, {
        username: username,
        domain: user.domain,
        quota: user.quota || "1GB",
        enabled: user.enabled !== "false",
      })
    })
  })
}

exports.check_auth = (next, connection) => {
  // Allow local connections without auth
  if (connection.remote.is_local) return next()

  // Require auth for submission ports
  if ([587, 465].includes(connection.local.port)) {
    if (!connection.notes.authenticated) {
      connection.respond(530, "Authentication required")
      return next(DENY)
    }
  }

  next()
}
