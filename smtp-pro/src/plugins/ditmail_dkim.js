// DITMail DKIM Plugin
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const redis = require("redis")

let redisClient

exports.register = function () {
  this.loginfo("Initializing DITMail DKIM")

  redisClient = redis.createClient({
    host: this.config.get("redis.host") || "localhost",
    port: this.config.get("redis.port") || 6379,
    db: this.config.get("redis.db") || 0,
  })

  this.register_hook("data_post", "sign_email")
}

exports.sign_email = function (next, connection) {
  const transaction = connection.transaction
  if (!transaction) return next()

  const mail_from = transaction.mail_from
  if (!mail_from || !mail_from.host) return next()

  const domain = mail_from.host.toLowerCase()

  this.get_dkim_key(domain, (err, keyData) => {
    if (err || !keyData) {
      this.logwarn(`No DKIM key found for domain: ${domain}`)
      return next()
    }

    try {
      const signature = this.generate_dkim_signature(transaction, keyData)
      if (signature) {
        transaction.add_header("DKIM-Signature", signature)
        this.loginfo(`DKIM signature added for domain: ${domain}`)
      }
    } catch (error) {
      this.logerror(`DKIM signing error: ${error.message}`)
    }

    next()
  })
}

exports.get_dkim_key = (domain, callback) => {
  const keyPath = path.join("/etc/haraka/dkim", domain, "private.key")

  fs.readFile(keyPath, "utf8", (err, privateKey) => {
    if (err) return callback(err)

    redisClient.hget(`domain:${domain}`, "dkim_selector", (err, selector) => {
      if (err) return callback(err)

      callback(null, {
        privateKey: privateKey,
        selector: selector || "default",
        domain: domain,
      })
    })
  })
}

exports.generate_dkim_signature = function (transaction, keyData) {
  const headers = [
    "from",
    "sender",
    "reply-to",
    "subject",
    "date",
    "message-id",
    "to",
    "cc",
    "mime-version",
    "content-type",
    "content-transfer-encoding",
  ]

  const canonicalizedHeaders = this.canonicalize_headers(transaction, headers)
  const canonicalizedBody = this.canonicalize_body(transaction.body)

  const bodyHash = crypto.createHash("sha256").update(canonicalizedBody).digest("base64")

  const dkimHeader = [
    `v=1`,
    `a=rsa-sha256`,
    `c=relaxed/relaxed`,
    `d=${keyData.domain}`,
    `s=${keyData.selector}`,
    `h=${headers.join(":")}`,
    `bh=${bodyHash}`,
    `b=`,
  ].join("; ")

  const signatureData = canonicalizedHeaders + `dkim-signature:${dkimHeader}`

  const signature = crypto.createSign("RSA-SHA256").update(signatureData).sign(keyData.privateKey, "base64")

  return dkimHeader.replace("b=", `b=${signature}`)
}

exports.canonicalize_headers = (transaction, headers) => {
  let result = ""

  headers.forEach((headerName) => {
    const headerValues = transaction.header.get_all(headerName)
    if (headerValues && headerValues.length > 0) {
      headerValues.forEach((value) => {
        result += `${headerName.toLowerCase()}:${value.replace(/\s+/g, " ").trim()}\r\n`
      })
    }
  })

  return result
}

exports.canonicalize_body = (body) => {
  if (!body) return "\r\n"

  // Simple relaxed canonicalization
  return (
    body
      .toString()
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+\r\n/g, "\r\n")
      .replace(/\r\n$/, "") + "\r\n"
  )
}
