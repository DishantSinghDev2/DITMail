import { Server, Socket } from "socket.io"; // Make sure Socket is imported
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId: string;
  email: string;
  orgId: string;
  role: string;
  sessionId: string;
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

let redis: Redis | null = null;
function getRedisClient() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }
  return redis;
}

let io: Server;

// This TypeScript declaration tells the compiler that our custom properties exist on socket
declare module "socket.io" {
  interface Socket {
      userId: string;
      userEmail: string;
      orgId: string;
  }
}

export function initializeWebSocket(server: any) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
    });

    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token"));
      }
      const payload = verifyToken(token);

      if (!payload) {
        return next(new Error("Authentication error: Invalid token"));
      }
      
      // FIX: Attach all custom data to socket
      socket.userId = payload.userId;
      socket.userEmail = payload.email;
      socket.orgId = payload.orgId;
      
      console.log(`User ${socket.userEmail} passed authentication.`);
      next();
    });

    io.on("connection", (socket) => {
      // FIX: Read all custom data from socket
      const userEmail = socket.userEmail;

      console.log(`[Socket Setup] User ${userEmail} connected. Subscribing to channel: mailbox:events:${userEmail}`);

      socket.join(`user:${socket.userId}`);
      socket.join(`org:${socket.orgId}`);

      const subscriber = getRedisClient().duplicate();
      subscriber.subscribe(`mailbox:events:${userEmail}`);

      subscriber.on("message", (channel, message) => {
        console.log(`[Redis Message] SUCCESS: Received message on channel '${channel}'. Emitting 'mailbox_event' to user ${userEmail}.`);
        try {
          const event = JSON.parse(message);
          socket.emit("mailbox_event", event);
          console.log(`[Socket Emit] Successfully emitted event to socket for user ${userEmail}.`);
        } catch (e) {
          console.error("[Redis Message] Error parsing JSON from Redis:", e);
        }
      });

      subscriber.on("error", (err) => {
        console.error(`[Redis Subscriber Error] An error occurred with the Redis subscriber for ${userEmail}:`, err);
      });

      socket.on("disconnect", () => {
        console.log(`[Socket Teardown] User ${userEmail} disconnected. Unsubscribing and quitting Redis subscriber.`);
        subscriber.unsubscribe();
        subscriber.quit();
      });
    });
  }
  return io;
}

export { io };