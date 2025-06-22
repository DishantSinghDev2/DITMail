// DITMail Queue Management Plugin
const fs = require("fs").promises
const path = require("path")
const crypto = require("crypto")
const redis = require("redis")

let redisClient

exports.register = function () {
  this.loginfo("Initializing DITMail Queue Plugin")

  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  redisClient.connect().catch((err) => {
    this.logerror("Failed to connect to Redis: " + err)
  })

  this.register_hook("queue", "queue_message")
  this.register_hook("queue_outbound", "queue_outbound_message")

  // Start queue processor
  this.start_queue_processor()
}

exports.queue_message = function (next, connection) {
  const transaction = connection.transaction
  if (!transaction) return next()

  // Check if this is local delivery
  if (connection.notes.local_delivery) {
    // Let ditmail_delivery handle local delivery
    return next()
  }

  // Queue for outbound delivery
  this.add_to_queue(transaction, connection, (err) => {
    if (err) {
      this.logerror("Failed to queue message: " + err)
      return next(DENYSOFT, "Temporary failure - message queued")
    }

    this.loginfo("Message queued for delivery")
    next(OK)
  })
}

exports.queue_outbound_message = function (next, hmail) {
  // Handle outbound messages from the queue
  this.loginfo(`Processing outbound message: ${hmail.filename}`)

  this.deliver_message(hmail, (err, result) => {
    if (err) {
      this.logerror(`Delivery failed: ${err}`)
      return next(DENYSOFT)
    }

    this.loginfo(`Message delivered successfully: ${result}`)
    next(OK)
  })
}

exports.add_to_queue = async (transaction, connection, callback) => {
  try {
    const messageId = crypto.randomUUID()
    const queueDir = path.join(process.cwd(), "queue")

    // Ensure queue directory exists
    await fs.mkdir(queueDir, { recursive: true })

    // Prepare message data
    const messageData = {
      id: messageId,
      from: transaction.mail_from ? transaction.mail_from.address() : "",
      to: transaction.rcpt_to.map((rcpt) => rcpt.address()),
      headers: transaction.header.toString(),
      body: transaction.body.toString(),
      created: Date.now(),
      attempts: 0,
      next_attempt: Date.now(),
      remote_ip: connection.remote.ip,
      authenticated: connection.notes.authenticated || false,
      auth_user: connection.notes.auth_user ? connection.notes.auth_user.username : null,
    }

    // Save message to file
    const messageFile = path.join(queueDir, `${messageId}.json`)
    await fs.writeFile(messageFile, JSON.stringify(messageData, null, 2))

    // Add to Redis queue
    if (redisClient.isOpen) {
      await redisClient.lPush("mail_queue", messageId)
      await redisClient.hSet(`queue:${messageId}`, messageData)
    }

    callback(null, messageId)
  } catch (error) {
    callback(error)
  }
}

exports.start_queue_processor = function () {
  // Process queue every 60 seconds
  setInterval(() => {
    this.process_queue()
  }, 60000)

  this.loginfo("Queue processor started")
}

exports.process_queue = async function () {
  if (!redisClient.isOpen) return

  try {
    // Get messages from queue
    const messageId = await redisClient.rPop("mail_queue")
    if (!messageId) return

    const messageData = await redisClient.hGetAll(`queue:${messageId}`)
    if (!messageData || !messageData.id) return

    // Check if it's time to attempt delivery
    const nextAttempt = Number.parseInt(messageData.next_attempt || 0)
    if (Date.now() < nextAttempt) {
      // Put back in queue
      await redisClient.lPush("mail_queue", messageId)
      return
    }

    this.loginfo(`Processing queued message: ${messageId}`)

    // Attempt delivery
    this.attempt_delivery(messageData, async (err, success) => {
      const attempts = Number.parseInt(messageData.attempts || 0) + 1

      if (success) {
        // Remove from queue
        await redisClient.del(`queue:${messageId}`)
        this.loginfo(`Message ${messageId} delivered successfully`)
      } else {
        // Update attempt count and schedule retry
        const retryIntervals = [300, 900, 1800, 3600, 7200, 14400, 28800] // seconds
        const maxAttempts = 7

        if (attempts >= maxAttempts) {
          // Bounce message
          await this.bounce_message(messageData)
          await redisClient.del(`queue:${messageId}`)
          this.loginfo(`Message ${messageId} bounced after ${attempts} attempts`)
        } else {
          // Schedule retry
          const nextRetry = Date.now() + (retryIntervals[attempts - 1] || 28800) * 1000
          await redisClient.hSet(`queue:${messageId}`, {
            attempts: attempts.toString(),
            next_attempt: nextRetry.toString(),
            last_error: err ? err.message : "Unknown error",
          })
          await redisClient.lPush("mail_queue", messageId)
          this.loginfo(`Message ${messageId} scheduled for retry (attempt ${attempts})`)
        }
      }
    })
  } catch (error) {
    this.logerror("Queue processing error: " + error)
  }
}

exports.attempt_delivery = function (messageData, callback) {
  // Simple delivery attempt using nodemailer
  const nodemailer = require("nodemailer")

  // Create transporter for outbound delivery
  const transporter = nodemailer.createTransporter({
    host: "localhost",
    port: 25,
    secure: false,
    ignoreTLS: true,
  })

  const mailOptions = {
    from: messageData.from,
    to: messageData.to,
    raw: messageData.headers + "\r\n" + messageData.body,
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      this.logerror(`Delivery error: ${error.message}`)
      callback(error, false)
    } else {
      this.loginfo(`Message delivered: ${info.messageId}`)
      callback(null, true)
    }
  })
}

exports.bounce_message = async function (messageData) {
  // Create bounce message
  const bounceMessage = {
    from: "mailer-daemon@" + (process.env.MAIL_SERVER_DOMAIN || "localhost"),
    to: messageData.from,
    subject: "Delivery Status Notification (Failure)",
    text: `
Your message could not be delivered to the following recipients:

${messageData.to.join(", ")}

This is a permanent error. The message has been removed from the queue.

Original message details:
- Message ID: ${messageData.id}
- Attempts: ${messageData.attempts}
- Last error: ${messageData.last_error || "Unknown error"}
`,
  }

  // Queue bounce message for delivery
  try {
    await this.add_to_queue({ mail_from: { address: () => bounceMessage.from } }, {}, () => {})
  } catch (error) {
    this.logerror("Failed to queue bounce message: " + error)
  }
}

const OK = "OK"
const DENYSOFT = "DENYSOFT"
