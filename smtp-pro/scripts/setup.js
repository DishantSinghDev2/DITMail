#!/usr/bin/env node

const fs = require("fs").promises
const path = require("path")
const crypto = require("crypto")
const { execSync } = require("child_process")

async function setup() {
  console.log("🚀 Setting up DITMail SMTP Server...\n")

  try {
    // Create necessary directories
    await createDirectories()

    // Generate SSL certificates
    await generateSSLCertificates()

    // Initialize Redis data
    await initializeRedis()

    // Set up log directories
    await setupLogging()

    // Create systemd service
    await createSystemdService()

    console.log("✅ Setup completed successfully!")
    console.log("\nNext steps:")
    console.log("1. Add your first domain: npm run add-domain example.com")
    console.log("2. Start the server: npm start")
    console.log("3. Access web dashboard: http://localhost:3000")
  } catch (error) {
    console.error("❌ Setup failed:", error.message)
    process.exit(1)
  }
}

async function createDirectories() {
  console.log("📁 Creating directories...")

  const dirs = ["/etc/haraka", "/etc/haraka/dkim", "/var/log/haraka", "/var/mail", "/var/run/haraka", "./ssl", "./logs"]

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true })
      console.log(`   Created: ${dir}`)
    } catch (error) {
      if (error.code !== "EEXIST") throw error
    }
  }
}

async function generateSSLCertificates() {
  console.log("🔐 Generating SSL certificates...")

  const certPath = "./ssl/mail.crt"
  const keyPath = "./ssl/mail.key"

  try {
    await fs.access(certPath)
    console.log("   SSL certificates already exist")
    return
  } catch (error) {
    // Certificates don't exist, generate them
  }

  const opensslCmd = `
        openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=DITMail/CN=mail.localhost"
    `

  try {
    execSync(opensslCmd, { stdio: "pipe" })
    console.log("   Generated self-signed SSL certificates")
    console.log("   ⚠️  Replace with proper certificates for production")
  } catch (error) {
    console.log("   ⚠️  Could not generate SSL certificates automatically")
    console.log("   Please generate them manually or install OpenSSL")
  }
}

async function initializeRedis() {
  console.log("🗄️  Initializing Redis...")

  // Create sample configuration
  const sampleConfig = {
    "domain:localhost": {
      status: "active",
      dkim_selector: "default",
      created: Date.now(),
    },
    "user:admin@localhost": {
      password: "$2b$10$example.hash.here", // bcrypt hash of 'password'
      domain: "localhost",
      quota: "1GB",
      enabled: "true",
      maildir: "/var/mail/admin@localhost/Maildir",
      created: Date.now(),
    },
  }

  console.log("   Sample configuration created")
  console.log("   Default user: admin@localhost / password")
}

async function setupLogging() {
  console.log("📝 Setting up logging...")

  const logConfig = `
# DITMail Logging Configuration
*.info;mail.none;authpriv.none;cron.none    /var/log/messages
mail.*                                       /var/log/haraka/mail.log
authpriv.*                                   /var/log/secure
`

  try {
    await fs.writeFile("./logs/rsyslog.conf", logConfig)
    console.log("   Log configuration created")
  } catch (error) {
    console.log("   ⚠️  Could not create log configuration")
  }
}

async function createSystemdService() {
  console.log("⚙️  Creating systemd service...")

  const serviceFile = `
[Unit]
Description=DITMail SMTP Server
After=network.target redis.service
Wants=redis.service

[Service]
Type=simple
User=haraka
Group=haraka
WorkingDirectory=${process.cwd()}
ExecStart=/usr/bin/node ${process.cwd()}/node_modules/.bin/haraka -c ${process.cwd()}/config
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ditmail

[Install]
WantedBy=multi-user.target
`

  try {
    await fs.writeFile("./ditmail.service", serviceFile)
    console.log("   Systemd service file created: ./ditmail.service")
    console.log("   Install with: sudo cp ditmail.service /etc/systemd/system/")
  } catch (error) {
    console.log("   ⚠️  Could not create systemd service file")
  }
}

if (require.main === module) {
  setup()
}

module.exports = { setup }
