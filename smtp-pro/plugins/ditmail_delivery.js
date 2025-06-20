// DITMail Maildir Delivery Plugin
const fs = require("fs").promises
const path = require("path")
const crypto = require("crypto")
const redis = require("redis")
const { OK, DENYSOFT } = require("haraka-constants")

let redisClient

exports.register = function () {
  this.loginfo("Initializing DITMail Maildir Delivery")

  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  this.register_hook("queue", "deliver_to_maildir")
}

exports.deliver_to_maildir = function (next, connection) {
  const transaction = connection.transaction
  if (!transaction) return next()

  // Only handle local deliveries
  if (!connection.notes.local_domain) return next()

  const recipients = transaction.rcpt_to
  const promises = recipients.map((rcpt) => this.deliver_message(transaction, rcpt))

  Promise.all(promises)
    .then(() => {
      this.loginfo("Message delivered to all local recipients")
      next(OK)
    })
    .catch((err) => {
      this.logerror("Delivery error: " + err.message)
      next(DENYSOFT, "Temporary delivery failure")
    })
}

exports.deliver_message = async function (transaction, recipient) {
  const email = recipient.address().toLowerCase()
  const [localpart, domain] = email.split("@")

  // Check if user exists
  const userExists = await this.check_user_exists(email)
  if (!userExists) {
    throw new Error(`User ${email} does not exist`)
  }

  // Get user's maildir path
  const maildirPath = await this.get_maildir_path(email)

  // Ensure maildir structure exists
  await this.ensure_maildir_structure(maildirPath)

  // Generate unique filename
  const filename = this.generate_maildir_filename()

  // Write message to tmp first
  const tmpPath = path.join(maildirPath, "tmp", filename)
  const newPath = path.join(maildirPath, "new", filename)

  // Prepare message content
  const messageContent = this.prepare_message_content(transaction)

  // Write to tmp directory first
  await fs.writeFile(tmpPath, messageContent)

  // Move to new directory (atomic operation)
  await fs.rename(tmpPath, newPath)

  // Update user statistics
  await this.update_user_stats(email)

  this.loginfo(`Message delivered to ${email}`)
}

exports.check_user_exists = (email) =>
  new Promise((resolve, reject) => {
    redisClient.exists(`user:${email}`, (err, exists) => {
      if (err) reject(err)
      else resolve(exists === 1)
    })
  })

exports.get_maildir_path = (email) =>
  new Promise((resolve, reject) => {
    redisClient.hget(`user:${email}`, "maildir", (err, maildir) => {
      if (err) reject(err)
      else resolve(maildir || `/var/mail/${email}/Maildir`)
    })
  })

exports.ensure_maildir_structure = async (maildirPath) => {
  const dirs = ["tmp", "new", "cur"]

  // Create main maildir
  await fs.mkdir(maildirPath, { recursive: true })

  // Create subdirectories
  for (const dir of dirs) {
    await fs.mkdir(path.join(maildirPath, dir), { recursive: true })
  }
}

exports.generate_maildir_filename = () => {
  const timestamp = Math.floor(Date.now() / 1000)
  const microseconds = process.hrtime()[1]
  const hostname = require("os").hostname()
  const random = crypto.randomBytes(4).toString("hex")

  return `${timestamp}.M${microseconds}P${process.pid}.${hostname}.${random}`
}

exports.prepare_message_content = (transaction) => {
  let content = ""

  // Add Return-Path header
  if (transaction.mail_from) {
    content += `Return-Path: <${transaction.mail_from.address()}>\r\n`
  }

  // Add Delivered-To header
  transaction.rcpt_to.forEach((rcpt) => {
    content += `Delivered-To: ${rcpt.address()}\r\n`
  })

  // Add Received header
  content += `Received: from ${transaction.hello.host} (${transaction.remote.ip})\r\n`
  content += `\tby ${require("os").hostname()} with SMTP\r\n`
  content += `\tfor <${transaction.rcpt_to[0].address()}>;\r\n`
  content += `\t${new Date().toUTCString()}\r\n`

  // Add original headers and body
  content += transaction.header.toString()
  content += "\r\n"
  content += transaction.body.toString()

  return content
}

exports.update_user_stats = (email) =>
  new Promise((resolve, reject) => {
    const userKey = `user:${email}`
    const statsKey = `stats:${email}`

    redisClient
      .multi()
      .hincrby(statsKey, "messages_received", 1)
      .hincrby(statsKey, "bytes_received", 0) // TODO: calculate actual size
      .hset(userKey, "last_delivery", Date.now())
      .exec((err, results) => {
        if (err) reject(err)
        else resolve(results)
      })
  })
