import { Server } from "socket.io"
import { redis } from "./redis"
import { verifyToken } from "./auth"

let io: Server

export function initializeWebSocket(server: any) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ["GET", "POST"],
      },
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
      const subscriber = redis.duplicate()
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

      // Handle typing indicators for compose
      socket.on("typing_start", (data) => {
        socket.to(`org:${socket.orgId}`).emit("user_typing", {
          userId: socket.userId,
          email: socket.userEmail,
          ...data,
        })
      })

      socket.on("typing_stop", (data) => {
        socket.to(`org:${socket.orgId}`).emit("user_stopped_typing", {
          userId: socket.userId,
          email: socket.userEmail,
          ...data,
        })
      })
    })

    // Redis subscriber for system-wide events
    const systemSubscriber = redis.duplicate()
    systemSubscriber.subscribe("system:events")

    systemSubscriber.on("message", (channel, message) => {
      const event = JSON.parse(message)
      io.emit("system_event", event)
    })
  }

  return io
}

export { io }
