const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs").promises
const { authenticateToken } = require("../middleware/auth")
const mysql = require("mysql2/promise")
const redis = require("redis")

const router = express.Router()

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
})
redisClient.connect().catch(console.error)

// MySQL connection
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ditmail",
  port: process.env.DB_PORT || 3306,
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads", req.user.organizationId)
    await fs.mkdir(uploadPath, { recursive: true })
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for email attachments
    cb(null, true)
  },
})

// Upload file endpoint
router.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    const connection = await mysql.createConnection(dbConfig)

    const [result] = await connection.execute(
      `INSERT INTO Attachment (filename, originalName, mimeType, size, path, organizationId, uploadedBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.file.path,
        req.user.organizationId,
        req.user.id,
      ],
    )

    await connection.end()

    // Cache file info in Redis
    const fileData = {
      id: result.insertId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      organizationId: req.user.organizationId,
      uploadedBy: req.user.id,
      createdAt: new Date().toISOString(),
    }

    await redisClient.setEx(`file:${result.insertId}`, 3600, JSON.stringify(fileData))

    res.json({
      message: "File uploaded successfully",
      file: fileData,
    })
  } catch (error) {
    console.error("File upload error:", error)
    res.status(500).json({ error: "File upload failed" })
  }
})

// Get user's files
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const connection = await mysql.createConnection(dbConfig)

    const [files] = await connection.execute(
      `SELECT id, filename, originalName, mimeType, size, createdAt 
       FROM Attachment 
       WHERE organizationId = ? 
       ORDER BY createdAt DESC 
       LIMIT ? OFFSET ?`,
      [req.user.organizationId, Number.parseInt(limit), offset],
    )

    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM Attachment WHERE organizationId = ?`,
      [req.user.organizationId],
    )

    await connection.end()

    res.json({
      files,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    })
  } catch (error) {
    console.error("Get files error:", error)
    res.status(500).json({ error: "Failed to fetch files" })
  }
})

// Download file
router.get("/download/:id", authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id

    // Try to get from Redis cache first
    let fileData = await redisClient.get(`file:${fileId}`)

    if (!fileData) {
      const connection = await mysql.createConnection(dbConfig)

      const [files] = await connection.execute(`SELECT * FROM Attachment WHERE id = ? AND organizationId = ?`, [
        fileId,
        req.user.organizationId,
      ])

      await connection.end()

      if (files.length === 0) {
        return res.status(404).json({ error: "File not found" })
      }

      fileData = files[0]
      // Cache for future requests
      await redisClient.setEx(`file:${fileId}`, 3600, JSON.stringify(fileData))
    } else {
      fileData = JSON.parse(fileData)
    }

    // Check if file exists on disk
    try {
      await fs.access(fileData.path)
    } catch {
      return res.status(404).json({ error: "File not found on disk" })
    }

    res.setHeader("Content-Disposition", `attachment; filename="${fileData.originalName}"`)
    res.setHeader("Content-Type", fileData.mimeType)
    res.sendFile(path.resolve(fileData.path))
  } catch (error) {
    console.error("File download error:", error)
    res.status(500).json({ error: "File download failed" })
  }
})

// Delete file
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id
    const connection = await mysql.createConnection(dbConfig)

    const [files] = await connection.execute(`SELECT * FROM Attachment WHERE id = ? AND organizationId = ?`, [
      fileId,
      req.user.organizationId,
    ])

    if (files.length === 0) {
      await connection.end()
      return res.status(404).json({ error: "File not found" })
    }

    const file = files[0]

    // Delete from database
    await connection.execute(`DELETE FROM Attachment WHERE id = ?`, [fileId])

    await connection.end()

    // Delete from Redis cache
    await redisClient.del(`file:${fileId}`)

    // Delete from disk
    try {
      await fs.unlink(file.path)
    } catch (error) {
      console.error("Failed to delete file from disk:", error)
    }

    res.json({ message: "File deleted successfully" })
  } catch (error) {
    console.error("File deletion error:", error)
    res.status(500).json({ error: "File deletion failed" })
  }
})

module.exports = router
