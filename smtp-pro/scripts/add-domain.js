#!/usr/bin/env node

const fs = require("fs").promises
const path = require("path")
const crypto = require("crypto")
const dns = require("dns").promises
const redis = require("redis")

async function addDomain(domain) {
  if (!domain) {
    console.error("Usage: node add-domain.js <domain>")
    process.exit(1)
  }

  console.log(`🌐 Adding domain: ${domain}\n`)

  try {
    // Validate domain
    await validateDomain(domain)

    // Generate DKIM keys
    await generateDKIMKeys(domain)

    // Add to Redis
    await addDomainToRedis(domain)

    // Generate DNS records
    await generateDNSRecords(domain)

    console.log(`✅ Domain ${domain} added successfully!`)
    console.log("\nNext steps:")
    console.log("1. Add the DNS records shown above")
    console.log("2. Verify DNS propagation")
    console.log("3. Add users for this domain")
  } catch (error) {
    console.error("❌ Failed to add domain:", error.message)
    process.exit(1)
  }
}

async function validateDomain(domain) {
  console.log("🔍 Validating domain...")

  // Basic domain format validation
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
  if (!domainRegex.test(domain)) {
    throw new Error("Invalid domain format")
  }

  // Check if domain resolves
  try {
    await dns.lookup(domain)
    console.log("   Domain resolves ✓")
  } catch (error) {
    console.log("   ⚠️  Domain does not resolve (this is OK for new domains)")
  }
}

async function generateDKIMKeys(domain) {
  console.log("🔑 Generating DKIM keys...")

  const dkimDir = path.join("/etc/haraka/dkim", domain)
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

  console.log(`   DKIM keys generated in ${dkimDir}`)
}

async function addDomainToRedis(domain) {
  console.log("💾 Adding domain to database...")

  const client = redis.createClient()
  await client.connect()

  const domainData = {
    status: "active",
    dkim_selector: "default",
    spf_record: `v=spf1 mx a:mail.${domain} -all`,
    dmarc_policy: "v=DMARC1; p=quarantine; rua=mailto:dmarc@" + domain,
    created: Date.now(),
    updated: Date.now(),
  }

  await client.hSet(`domain:${domain}`, domainData)
  await client.sAdd("domains:active", domain)

  await client.disconnect()
  console.log("   Domain added to database ✓")
}

async function generateDNSRecords(domain) {
  console.log("📋 Generating DNS records...")

  // Read public key for DKIM
  const publicKeyPath = path.join("/etc/haraka/dkim", domain, "public.key")
  const publicKeyPem = await fs.readFile(publicKeyPath, "utf8")

  // Extract public key data (remove headers and newlines)
  const publicKeyData = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\n/g, "")

  const dnsRecords = `
📋 DNS Records for ${domain}:

MX Record:
${domain}.    IN    MX    10    mail.${domain}.

A Record (for mail server):
mail.${domain}.    IN    A    YOUR_SERVER_IP

DKIM Record:
default._domainkey.${domain}.    IN    TXT    "v=DKIM1; k=rsa; p=${publicKeyData}"

SPF Record:
${domain}.    IN    TXT    "v=spf1 mx a:mail.${domain} -all"

DMARC Record:
_dmarc.${domain}.    IN    TXT    "v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}"

PTR Record (Reverse DNS):
YOUR_SERVER_IP    IN    PTR    mail.${domain}.
`

  console.log(dnsRecords)

  // Save to file
  const recordsFile = `./dns-records-${domain}.txt`
  await fs.writeFile(recordsFile, dnsRecords)
  console.log(`   DNS records saved to: ${recordsFile}`)
}

if (require.main === module) {
  const domain = process.argv[2]
  addDomain(domain)
}

module.exports = { addDomain }
