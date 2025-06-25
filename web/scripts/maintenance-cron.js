import cron from "node-cron"
import connectDB from "../lib/db.js"
import Domain from "../models/Domain.js"
import Message from "../models/Message.js"
import { verifyDNSRecords } from "../lib/dns.js"
import { logInfo, logError } from "../lib/logger.js"
import BackupSystem from "./backup-system.js"

class MaintenanceSystem {
  constructor() {
    this.backupSystem = new BackupSystem()
  }

  async startCronJobs() {
    console.log("Starting maintenance cron jobs...")

    // DNS verification every 6 hours
    cron.schedule("0 */6 * * *", async () => {
      await this.verifyAllDomains()
    })

    // Daily backup at 2 AM
    cron.schedule("0 2 * * *", async () => {
      await this.performDailyBackup()
    })

    // Weekly cleanup at Sunday 3 AM
    cron.schedule("0 3 * * 0", async () => {
      await this.performWeeklyCleanup()
    })

    // Hourly system health check
    cron.schedule("0 * * * *", async () => {
      await this.performHealthCheck()
    })

    // Daily analytics aggregation at 1 AM
    cron.schedule("0 1 * * *", async () => {
      await this.aggregateDailyAnalytics()
    })

    console.log("All cron jobs scheduled successfully")
  }

  async verifyAllDomains() {
    try {
      logInfo("Starting scheduled domain verification")
      await connectDB()

      const pendingDomains = await Domain.find({
        status: { $ne: "verified" },
      })

      console.log(`Verifying ${pendingDomains.length} domains...`)

      for (const domain of pendingDomains) {
        try {
          const verification = await verifyDNSRecords(domain.domain)

          const updates = {
            mx_verified: verification.mx,
            spf_verified: verification.spf,
            dkim_verified: verification.dkim,
            dmarc_verified: verification.dmarc,
            status:
              verification.mx && verification.spf && verification.dkim && verification.dmarc ? "verified" : "pending",
            last_verified: new Date(),
          }

          await Domain.findByIdAndUpdate(domain._id, updates)

          logInfo("Domain verification updated", {
            domain: domain.domain,
            status: updates.status,
            verification,
          })
        } catch (error) {
          logError(error, { context: "Domain verification", domain: domain.domain })
        }
      }

      logInfo("Domain verification completed")
    } catch (error) {
      logError(error, { context: "Scheduled domain verification" })
    }
  }

  async performDailyBackup() {
    try {
      logInfo("Starting daily backup")
      await this.backupSystem.performFullBackup()
      logInfo("Daily backup completed")
    } catch (error) {
      logError(error, { context: "Daily backup" })
    }
  }

  async performWeeklyCleanup() {
    try {
      logInfo("Starting weekly cleanup")
      await connectDB()

      // Clean up old trash messages (older than 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const deletedMessages = await Message.deleteMany({
        folder: "trash",
        created_at: { $lt: thirtyDaysAgo },
      })

      logInfo("Weekly cleanup completed", {
        deletedMessages: deletedMessages.deletedCount,
      })
    } catch (error) {
      logError(error, { context: "Weekly cleanup" })
    }
  }

  async performHealthCheck() {
    try {
      // Basic health checks
      await connectDB()

      // Check for failed messages
      const failedMessages = await Message.countDocuments({ status: "failed" })

      if (failedMessages > 100) {
        logError(new Error("High number of failed messages detected"), {
          failedMessages,
          context: "Health check",
        })
      }

      // Check for stuck queued messages
      const stuckMessages = await Message.countDocuments({
        status: "queued",
        created_at: { $lt: new Date(Date.now() - 60 * 60 * 1000) }, // Older than 1 hour
      })

      if (stuckMessages > 0) {
        logError(new Error("Stuck queued messages detected"), {
          stuckMessages,
          context: "Health check",
        })
      }
    } catch (error) {
      logError(error, { context: "Health check" })
    }
  }

  async aggregateDailyAnalytics() {
    try {
      logInfo("Starting daily analytics aggregation")
      // This would aggregate daily statistics for faster reporting
      // Implementation would depend on specific analytics requirements
      logInfo("Daily analytics aggregation completed")
    } catch (error) {
      logError(error, { context: "Daily analytics aggregation" })
    }
  }
}

// Start the maintenance system
const maintenance = new MaintenanceSystem()
maintenance.startCronJobs()

export default MaintenanceSystem
