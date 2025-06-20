#!/usr/bin/env node

const fs = require("fs").promises
const path = require("path")
const crypto = require("crypto")
const { execSync } = require("child_process")
const redis = require("redis")

const MAIL_DOMAIN = process.env.MAIL_SERVER_DOMAIN || "mail.freecustom.email"
const SMTP_DOMAIN = process.env.SMTP_DOMAIN || "smtp.freecustom.email"
const SERVER_IP = process.env.SERVER_IP || "YOUR_SERVER_IP"

async function setupServerDomain() {
  console.log(`🚀 Setting up DITMail server domain: ${MAIL_DOMAIN}\n`)

  try {
    // 1. Generate SSL certificates for server domain
    await generateServerSSL()

    // 2. Setup server DKIM keys
    await generateServerDKIM()

    // 3. Create server domain configuration
    await createServerDomainConfig()

    // 4. Generate DNS records for server domain
    await generateServerDNSRecords()

    // 5. Update Haraka configuration
    await updateHarakaConfig()

    console.log("✅ Server domain setup completed successfully!")
    console.log("\n📋 Next steps:")
    console.log("1. Add the DNS records shown above to your domain")
    console.log("2. Update your server firewall rules")
    console.log("3. Test SMTP connectivity")
    console.log("4. Add your first customer domain")
  } catch (error) {
    console.error("❌ Server domain setup failed:", error.message)
    process.exit(1)
  }
}

async function generateServerSSL() {
  console.log("🔐 Generating SSL certificates for server domain...")

  const certPath = `/etc/ssl/certs/${MAIL_DOMAIN.replace("mail.", "")}.crt`
  const keyPath = `/etc/ssl/private/${MAIL_DOMAIN.replace("mail.", "")}.key`

  try {
    await fs.access(certPath)
    console.log("   SSL certificates already exist")
    return
  } catch (error) {
    // Certificates don't exist, generate them
  }

  // Generate certificate for both mail and smtp subdomains
  const opensslCmd = `
        openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=DITMail/CN=${MAIL_DOMAIN}" \
        -addext "subjectAltName=DNS:${MAIL_DOMAIN},DNS:${SMTP_DOMAIN},DNS:*.freecustom.email"
    `

  try {
    execSync(opensslCmd, { stdio: "pipe" })
    console.log("   Generated SSL certificates for server domain")
    console.log("   ⚠️  Replace with proper certificates from Let's Encrypt for production")
  } catch (error) {
    console.log("   ⚠️  Could not generate SSL certificates automatically")
    console.log("   Please generate them manually or use Let's Encrypt")
  }
}

async function generateServerDKIM() {
  console.log("🔑 Generating DKIM keys for server domain...")

  const dkimDir = path.join("/etc/haraka/dkim", MAIL_DOMAIN)
  const privateKeyPath = path.join(dkimDir, "private.key")
  const publicKeyPath = path.join(dkimDir, "public.key")

  // Create DKIM directory
  await fs.mkdir(dkimDir, { recursive: true })

  // Generate RSA key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  })

  // Save keys
  await fs.writeFile(privateKeyPath, privateKey)
  await fs.writeFile(publicKeyPath, publicKey)

  // Set proper permissions
  await fs.chmod(privateKeyPath, 0o600)
  await fs.chmod(publicKeyPath, 0o644)

  console.log(`   DKIM keys generated for ${MAIL_DOMAIN}`)
}

async function createServerDomainConfig() {
  console.log("💾 Creating server domain configuration...")

  const client = redis.createClient()
  await client.connect()

  // Create server domain entry
  await client.hSet(`domain:${MAIL_DOMAIN}`, {
    type: "server",
    status: "active",
    dkim_selector: "default",
    spf_record: `v=spf1 a mx ip4:${SERVER_IP} -all`,
    dmarc_policy: `v=DMARC1; p=reject; rua=mailto:dmarc-reports@${MAIL_DOMAIN}`,
    created: Date.now(),
    is_server_domain: "true",
  })

  // Add to server domains list
  await client.sAdd("domains:server", MAIL_DOMAIN)
  await client.sAdd("domains:all", MAIL_DOMAIN)

  await client.disconnect()
  console.log("   Server domain configuration created")
}

async function generateServerDNSRecords() {
  console.log("📋 Generating DNS records for server domain...")

  // Read public key for DKIM
  const publicKeyPath = path.join("/etc/haraka/dkim", MAIL_DOMAIN, "public.key")
  const publicKeyPem = await fs.readFile(publicKeyPath, "utf8")

  // Extract public key data
  const publicKeyData = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\n/g, "")

  const baseDomain = MAIL_DOMAIN.replace("mail.", "")

  const dnsRecords = `
📋 DNS Records for ${baseDomain} (Server Domain):

A Records:
${MAIL_DOMAIN}.    IN    A    ${SERVER_IP}
${SMTP_DOMAIN}.    IN    A    ${SERVER_IP}

MX Record (for server domain):
${baseDomain}.    IN    MX    10    ${MAIL_DOMAIN}.

DKIM Record:
default._domainkey.${baseDomain}.    IN    TXT    "v=DKIM1; k=rsa; p=${publicKeyData}"

SPF Record:
${baseDomain}.    IN    TXT    "v=spf1 a mx ip4:${SERVER_IP} -all"

DMARC Record:
_dmarc.${baseDomain}.    IN    TXT    "v=DMARC1; p=reject; rua=mailto:dmarc-reports@${MAIL_DOMAIN}"

PTR Record (Reverse DNS - contact your hosting provider):
${SERVER_IP}    IN    PTR    ${MAIL_DOMAIN}.

📋 Customer Domain Template (for customers to use):

For customer domain "example.com":
MX Record:
example.com.    IN    MX    10    ${MAIL_DOMAIN}.

SPF Record:
example.com.    IN    TXT    "v=spf1 mx a:${MAIL_DOMAIN} include:${baseDomain} -all"

DMARC Record:
_dmarc.example.com.    IN    TXT    "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${MAIL_DOMAIN}"
`

  console.log(dnsRecords)

  // Save to file
  const recordsFile = `./dns-records-server-${baseDomain}.txt`
  await fs.writeFile(recordsFile, dnsRecords)
  console.log(`   DNS records saved to: ${recordsFile}`)
}

async function updateHarakaConfig() {
  console.log("⚙️  Updating Haraka configuration...")

  // Update plugins list to include new plugins
  const pluginsContent = `
# Core plugins
process_title
log.syslog

# Hostname and domain handling
ditmail_hostname
ditmail_customer_domains

# Connection handling
tls
max_unrecognized_commands
early_talker
relay.force_routing

# Authentication
auth/auth_base
ditmail_auth

# Anti-spam and security
spf
dkim_verify
dkim_sign
ditmail_dkim
ditmail_spf
rcpt_to.routes
mail_from.is_resolvable

# Content filtering
data.headers
attachment
clamd

# Queue and delivery
queue/smtp_forward
queue/smtp_proxy
ditmail_queue
ditmail_delivery

# Domain and user management
ditmail_domains
ditmail_users

# Monitoring
watch
`

  await fs.writeFile("./config/plugins", pluginsContent.trim())
  console.log("   Updated plugins configuration")

  // Create local domains file
  const localDomainsContent = `# Local domains handled by this server
# Server domain
${MAIL_DOMAIN}
${SMTP_DOMAIN}

# Customer domains are managed dynamically via Redis
# This file is used as fallback
`

  await fs.writeFile("./config/local_domains", localDomainsContent)
  console.log("   Created local domains configuration")
}

if (require.main === module) {
  setupServerDomain()
}

module.exports = { setupServerDomain }
