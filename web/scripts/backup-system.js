import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs/promises"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const execAsync = promisify(exec)

class BackupSystem {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  }

  async createMongoBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupDir = `/tmp/ditmail-backup-${timestamp}`

    try {
      console.log("Creating MongoDB backup...")

      await execAsync(`mongodump --uri="${process.env.MONGODB_URI}" --out="${backupDir}"`)

      // Compress backup
      const archivePath = `${backupDir}.tar.gz`
      await execAsync(`tar -czf "${archivePath}" -C "${backupDir}" .`)

      console.log(`MongoDB backup created: ${archivePath}`)
      return archivePath
    } catch (error) {
      console.error("MongoDB backup failed:", error)
      throw error
    }
  }

  async createRedisBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupPath = `/tmp/redis-backup-${timestamp}.rdb`

    try {
      console.log("Creating Redis backup...")

      // Trigger Redis BGSAVE
      await execAsync(`redis-cli --rdb "${backupPath}"`)

      console.log(`Redis backup created: ${backupPath}`)
      return backupPath
    } catch (error) {
      console.error("Redis backup failed:", error)
      throw error
    }
  }

  async uploadToS3(filePath, key) {
    try {
      const fileContent = await fs.readFile(filePath)

      const command = new PutObjectCommand({
        Bucket: process.env.BACKUP_S3_BUCKET,
        Key: key,
        Body: fileContent,
        ServerSideEncryption: "AES256",
      })

      await this.s3Client.send(command)
      console.log(`Backup uploaded to S3: ${key}`)
    } catch (error) {
      console.error("S3 upload failed:", error)
      throw error
    }
  }

  async performFullBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

    try {
      console.log("Starting full system backup...")

      // Create backups
      const mongoBackup = await this.createMongoBackup()
      const redisBackup = await this.createRedisBackup()

      // Upload to S3
      await this.uploadToS3(mongoBackup, `mongodb/backup-${timestamp}.tar.gz`)
      await this.uploadToS3(redisBackup, `redis/backup-${timestamp}.rdb`)

      // Cleanup local files
      await fs.unlink(mongoBackup)
      await fs.unlink(redisBackup)

      console.log("Full backup completed successfully")

      // Log backup completion
      await this.logBackupCompletion(timestamp)
    } catch (error) {
      console.error("Full backup failed:", error)
      await this.logBackupFailure(error)
      throw error
    }
  }

  async logBackupCompletion(timestamp) {
    // Log to monitoring system or database
    console.log(`Backup completed at ${timestamp}`)
  }

  async logBackupFailure(error) {
    // Log failure to monitoring system
    console.error("Backup failed:", error.message)
  }
}

// Run backup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const backup = new BackupSystem()
  backup.performFullBackup().catch(console.error)
}

export default BackupSystem
