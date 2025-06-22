// Domain Configuration for DITMail
const os = require("os")

// Your main mail server domain
const MAIL_SERVER_DOMAIN = process.env.MAIL_SERVER_DOMAIN || "mail.freecustom.email"
const SMTP_DOMAIN = process.env.SMTP_DOMAIN || "smtp.freecustom.email"
const SERVER_IP = process.env.SERVER_IP || "127.0.0.1"

module.exports = {
  // Main server configuration
  server: {
    hostname: MAIL_SERVER_DOMAIN,
    smtp_hostname: SMTP_DOMAIN,
    ip: SERVER_IP,
    ports: {
      smtp: 25,
      submission: 587,
      smtps: 465,
      imap: 993,
      imaps: 995,
      pop3: 110,
      pop3s: 995,
    },
  },

  // Default MX record configuration
  mx: {
    priority: 10,
    hostname: MAIL_SERVER_DOMAIN,
  },

  // DNS records template for customer domains
  getDNSRecords: (customerDomain) => {
    return {
      mx: [
        {
          type: "MX",
          name: customerDomain,
          value: `10 ${MAIL_SERVER_DOMAIN}`,
          ttl: 3600,
          description: "Mail Exchange record pointing to DITMail server",
        },
      ],
      a: [
        {
          type: "A",
          name: `mail.${customerDomain}`,
          value: SERVER_IP,
          ttl: 3600,
          description: "Optional: A record for mail subdomain",
        },
      ],
      txt: [
        {
          type: "TXT",
          name: customerDomain,
          value: `v=spf1 mx a:${MAIL_SERVER_DOMAIN} include:${MAIL_SERVER_DOMAIN} -all`,
          ttl: 3600,
          purpose: "SPF",
        },
        {
          type: "TXT",
          name: `_dmarc.${customerDomain}`,
          value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${MAIL_SERVER_DOMAIN}`,
          ttl: 3600,
          purpose: "DMARC",
        },
      ],
    }
  },

  // SMTP connection details for customers
  getSmtpConfig: (customerDomain) => {
    return {
      incoming: {
        imap: {
          server: MAIL_SERVER_DOMAIN,
          port: 993,
          security: "SSL/TLS",
          authentication: "Normal password",
        },
        pop3: {
          server: MAIL_SERVER_DOMAIN,
          port: 995,
          security: "SSL/TLS",
          authentication: "Normal password",
        },
      },
      outgoing: {
        smtp: {
          server: SMTP_DOMAIN,
          port: 587,
          security: "STARTTLS",
          authentication: "Normal password",
        },
        smtp_ssl: {
          server: SMTP_DOMAIN,
          port: 465,
          security: "SSL/TLS",
          authentication: "Normal password",
        },
      },
    }
  },
}
