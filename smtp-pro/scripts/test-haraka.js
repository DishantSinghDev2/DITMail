#!/usr/bin/env node

const { spawn } = require("child_process")
const fs = require("fs")

async function testHaraka() {
  console.log("🧪 Testing Haraka configuration...")

  // Check if config directory exists
  if (!fs.existsSync("config")) {
    console.error("❌ Config directory not found!")
    console.log("Please run this from the DITMail directory")
    process.exit(1)
  }

  // Test configuration
  console.log("1. Testing configuration syntax...")

  const testProcess = spawn("haraka", ["-c", ".", "--test"], {
    stdio: ["pipe", "pipe", "pipe"],
  })

  let output = ""
  let errorOutput = ""

  testProcess.stdout.on("data", (data) => {
    output += data.toString()
  })

  testProcess.stderr.on("data", (data) => {
    errorOutput += data.toString()
  })

  testProcess.on("close", (code) => {
    if (code === 0) {
      console.log("✅ Configuration test passed!")
      console.log("\n2. Starting Haraka in test mode...")
      startHarakaTest()
    } else {
      console.error("❌ Configuration test failed!")
      console.error("Error output:", errorOutput)
      console.log("Standard output:", output)

      if (errorOutput.includes("haproxy")) {
        console.log("\n💡 Tip: Run 'node scripts/fix-haraka-config.js' to fix HAProxy configuration")
      }
    }
  })
}

function startHarakaTest() {
  const harakaProcess = spawn("haraka", ["-c", ".", "-v"], {
    stdio: ["pipe", "pipe", "pipe"],
  })

  console.log("Starting Haraka server (press Ctrl+C to stop)...")

  harakaProcess.stdout.on("data", (data) => {
    console.log(data.toString().trim())
  })

  harakaProcess.stderr.on("data", (data) => {
    console.error(data.toString().trim())
  })

  harakaProcess.on("close", (code) => {
    console.log(`\nHaraka process exited with code ${code}`)
  })

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    console.log("\nStopping Haraka...")
    harakaProcess.kill("SIGTERM")
    process.exit(0)
  })
}

if (require.main === module) {
  testHaraka()
}
