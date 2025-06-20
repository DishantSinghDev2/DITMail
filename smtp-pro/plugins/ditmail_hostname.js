// Hostname and HELO/EHLO handling for DITMail
const config = require("../config/domains")

exports.register = function () {
  this.loginfo("Initializing DITMail Hostname Plugin")

  // Set server hostname
  this.config.hostname = config.server.hostname

  this.register_hook("connect", "set_hostname")
  this.register_hook("helo", "check_helo")
  this.register_hook("ehlo", "check_ehlo")
}

exports.set_hostname = function (next, connection) {
  // Set the hostname for this connection
  connection.local.host = config.server.hostname
  connection.hello.host = config.server.hostname

  this.loginfo(`Connection from ${connection.remote.ip} - Server: ${config.server.hostname}`)
  next()
}

exports.check_helo = function (next, connection, helo) {
  // Log HELO command
  this.loginfo(`HELO received: ${helo} from ${connection.remote.ip}`)

  // Store HELO hostname
  connection.hello.verb = "HELO"
  connection.hello.host = helo

  next()
}

exports.check_ehlo = function (next, connection, helo) {
  // Log EHLO command
  this.loginfo(`EHLO received: ${helo} from ${connection.remote.ip}`)

  // Store EHLO hostname
  connection.hello.verb = "EHLO"
  connection.hello.host = helo

  next()
}
