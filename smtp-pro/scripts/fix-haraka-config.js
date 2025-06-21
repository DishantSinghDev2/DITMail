#!/usr/bin/env node

const fs = require("fs").promises
const path = require("path")

async function fixHarakaConfig() {
  console.log("🔧 Fixing Haraka configuration issues...")

  try {
    // 1. Create missing configuration files
    await createMissingConfigs()

    // 2. Fix permissions
    await fixPermissions()

    // 3. Create required directories
    await createDirectories()

    // 4. Update plugins configuration
    await updatePluginsConfig()

    console.log("✅ Haraka configuration fixed successfully!")
    console.log("\nYou can now start Haraka with:")
    console.log("sudo haraka -c .")
  } catch (error) {
    console.error("❌ Failed to fix Haraka configuration:", error.message)
    process.exit(1)
  }
}

async function createMissingConfigs() {
  console.log("📝 Creating missing configuration files...")

  // HAProxy config
  const haproxyConfig = `; HAProxy Configuration for Haraka
[main]
enabled=false

[hosts]
; List of HAProxy hosts (empty if not using HAProxy)
`

  await fs.writeFile("config/haproxy.ini", haproxyConfig)
  console.log("   Created config/haproxy.ini")

  // SMTP forward config
  const smtpForwardConfig = `; SMTP Forward Configuration
[main]
enabled=false

[relay]
; Relay configuration
`

  await fs.writeFile("config/smtp_forward.ini", smtpForwardConfig)
  console.log("   Created config/smtp_forward.ini")

  // Queue config
  const queueConfig = `; Queue Configuration
[main]
enabled=true
delivery_concurrency=10

[retry]
intervals=300,900,1800,3600,7200,14400
max_attempts=6
`

  await fs.writeFile("config/queue.ini", queueConfig)
  console.log("   Created config/queue.ini")

  // Host list
  const hostList = `# Local hostnames
localhost
mail.freecustom.email
smtp.freecustom.email
freecustom.email
`

  await fs.writeFile("config/host_list", hostList)
  console.log("   Created config/host_list")

  // Me file (server identity)
  await fs.writeFile("config/me", "mail.freecustom.email")
  console.log("   Created config/me")

  // Local domains
  const localDomains = `# Local domains handled by this server
mail.freecustom.email
smtp.freecustom.email
freecustom.email
`

  await fs.writeFile("config/local_domains", localDomains)
  console.log("   Created config/local_domains")
}

async function fixPermissions() {
  console.log("🔐 Fixing file permissions...")

  try {
    // Make sure haraka user exists
    const { execSync } = require("child_process")

    try {
      execSync("id haraka", { stdio: "pipe" })
    } catch (error) {
      console.log("   Creating haraka user...")
      execSync("sudo useradd -r -s /bin/false -d /var/lib/haraka haraka", { stdio: "pipe" })
    }

    // Set ownership
    execSync("sudo chown -R haraka:haraka config/", { stdio: "pipe" })
    execSync("sudo chmod -R 755 config/", { stdio: "pipe" })

    console.log("   Fixed permissions")
  } catch (error) {
    console.log("   ⚠️  Could not fix permissions automatically")
    console.log("   Please run: sudo chown -R haraka:haraka config/")
  }
}

async function createDirectories() {
  console.log("📁 Creating required directories...")

  const dirs = [
    "/var/log/haraka",
    "/var/run/haraka",
    "/var/lib/haraka",
    "/etc/haraka",
    "/etc/haraka/dkim",
    "./logs",
    "./queue",
    "./tmp",
  ]

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true })
      console.log(`   Created: ${dir}`)
    } catch (error) {
      if (error.code !== "EEXIST") {
        console.log(`   ⚠️  Could not create ${dir}: ${error.message}`)
      }
    }
  }
}

async function updatePluginsConfig() {
  console.log("🔌 Updating plugins configuration...")

  const pluginsConfig = `# Core plugins
process_title

# Logging
log.syslog

# Connection handling
tls
max_unrecognized_commands
early_talker

# Authentication (simplified for now)
auth/auth_base

# Basic anti-spam
spf
dkim_verify
dkim_sign

# Content filtering
data.headers

# Queue and delivery
queue/smtp_forward

# Monitoring
watch
`

  await fs.writeFile("config/plugins", pluginsConfig)
  console.log("   Updated plugins configuration")
}

if (require.main === module) {
  fixHarakaConfig()
}

module.exports = { fixHarakaConfig }
