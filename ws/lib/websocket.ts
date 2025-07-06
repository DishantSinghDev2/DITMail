import { Server } from "socket.io"
import jwt  from "jsonwebtoken"
import { Redis } from "ioredis"

const JWT_SECRET = process.env.JWT_SECRET!

export interface JWTPayload {
  userId: string
  email: string
  orgId: string
  role: string
  sessionId: string
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

// Server-side Redis client (not for Edge Runtime)
let redis: Redis | null = null

function getRedisClient() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")
  }
  return redis
}
let io: Server

declare module "socket.io" {
  interface Socket {
    userId: string
    userEmail: string
    orgId: string
  }
}

export function initializeWebSocket(server: any) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ["websocket", "polling"], // optional
    })
    

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token
        const payload = verifyToken(token)

        if (!payload) {
          return next(new Error("Authentication error"))
        }

        socket.userId = payload.userId
        socket.userEmail = payload.email
        socket.orgId = payload.orgId
        next()
      } catch (error) {
        next(new Error("Authentication error"))
      }
    })

    io.on("connection", (socket) => {
      console.log(`User ${socket.userEmail} connected`)

      // Join user-specific room
      socket.join(`user:${socket.userId}`)
      socket.join(`org:${socket.orgId}`)

      // Subscribe to Redis events for this user
      const subscriber = getRedisClient().duplicate()
      subscriber.subscribe(`mailbox:events:${socket.userEmail}`)

      subscriber.on("message", (channel, message) => {
        const event = JSON.parse(message)
        socket.emit("mailbox_event", event)
      })

      socket.on("disconnect", () => {
        console.log(`User ${socket.userEmail} disconnected`)
        subscriber.unsubscribe()
        subscriber.quit()
      })

    })

    // Redis subscriber for system-wide events
    const systemSubscriber = getRedisClient().duplicate()
    systemSubscriber.subscribe("system:events")

    systemSubscriber.on("message", (channel, message) => {
      const event = JSON.parse(message)
      io.emit("system_event", event)
    })
  }

  return io
}

export { io }
