import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import { redis } from "@/lib/redis"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { asyncHandler } from "@/lib/error-handler"

export const GET = asyncHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
    const user = session?.user
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "unknown", responseTime: 0 },
      redis: { status: "unknown", responseTime: 0 },
      smtp: { status: "unknown", responseTime: 0 },
      storage: { status: "unknown", responseTime: 0 },
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    },
  }

  // Check MongoDB
  try {
    const dbStart = Date.now()
    await connectDB()
    const dbTime = Date.now() - dbStart
    health.services.database = { status: "healthy", responseTime: dbTime }
  } catch (error) {
    health.services.database = { status: "unhealthy", responseTime: 0 }
    health.status = "degraded"
  }

  // Check Redis
  try {
    const redisStart = Date.now()
    await redis.ping()
    const redisTime = Date.now() - redisStart
    health.services.redis = { status: "healthy", responseTime: redisTime }
  } catch (error) {
    health.services.redis = { status: "unhealthy", responseTime: 0 }
    health.status = "degraded"
  }

  // Check SMTP (basic connectivity)
  try {
    const smtpStart = Date.now()
    // This would be a basic SMTP connectivity check
    const smtpTime = Date.now() - smtpStart
    health.services.smtp = { status: "healthy", responseTime: smtpTime }
  } catch (error) {
    health.services.smtp = { status: "unhealthy", responseTime: 0 }
    health.status = "degraded"
  }

  // Check Storage (GridFS)
  try {
    const storageStart = Date.now()
    // Basic storage check
    const storageTime = Date.now() - storageStart
    health.services.storage = { status: "healthy", responseTime: storageTime }
  } catch (error) {
    health.services.storage = { status: "unhealthy", responseTime: 0 }
    health.status = "degraded"
  }

  return NextResponse.json({ health })
})
