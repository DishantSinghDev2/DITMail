#!/usr/bin/env node

const { spawn } = require("child_process")
const fs = require("fs")

function startHaraka() {
  console.log("🚀 Starting DITMail SMTP Server...")

  // Check if config exists
  if (!fs.existsSync("config")) {
    console.error("❌ Configuration not found!")
    console.log("Please run: node scripts/setup-haraka.js")
    process.exit(1)
  }

  // Determine Haraka command
  let harakaCmd = "haraka"
  if (!commandExists("haraka")) {
    if (fs.existsSync("node_modules/.bin/haraka")) {
      harakaCmd = "./node_modules/.bin/haraka"
    } else {
      console.error("❌ Haraka not found!")
      console.log("Please run: npm install haraka")
      process.exit(1)
    }
  }

  console.log(`Using Haraka: ${harakaCmd}`)

  // Start Haraka
  const harakaProcess = spawn(harakaCmd, ["-c", ".", "-v"], {
    stdio: "inherit",
  })

  harakaProcess.on("error", (error) => {
    console.error("❌ Failed to start Haraka:", error.message)
    process.exit(1)
  })

  harakaProcess.on("close", (code) => {
    console.log(`\nHaraka process exited with code ${code}`)
  })

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    console.log("\n🛑 Stopping Haraka...")
    harakaProcess.kill("SIGTERM")
    process.exit(0)
  })

  console.log("✅ Haraka started successfully!")
  console.log("Press Ctrl+C to stop")
}

function commandExists(command) {
  try {
    require("child_process").execSync(`which ${command}`, { stdio: "pipe" })
    return true
  } catch (error) {
    return false
  }
}

if (require.main === module) {
  startHaraka()
}

module.exports = { startHaraka }
