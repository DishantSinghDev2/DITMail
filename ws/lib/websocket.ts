import { Server, Socket } from "socket.io"; // Make sure Socket is imported
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
// --- NEW: Import decode from next-auth/jwt ---
import { decode } from "next-auth/jwt";
// --- REMOVE: The old jwt import ---
// import jwt from "jsonwebtoken";

// The secret remains the same
const JWT_SECRET = process.env.JWT_SECRET!;

// Your JWTPayload interface from [...nextauth].ts is a good reference here.
// It should match the structure of the token object from your NextAuth jwt callback.
export interface JWTPayload {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  org_id: string;
  // ... and any other fields you added
}

// --- NEW: A new function using next-auth's decode ---
async function verifyAndDecodeToken(token: string): Promise<JWTPayload | null> {
  try {
    const decodedToken = await decode({
      token: token,
      secret: JWT_SECRET,
    });
    // The decode function returns null if verification fails
    return decodedToken as JWTPayload | null;
  } catch (err) {
    console.error("Token decoding error:", err);
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
      const payload = await verifyAndDecodeToken(token);

      if (!payload) {
        return next(new Error("Authentication error: Invalid token"));
      }
      
      // FIX: Attach all custom data to socket
      socket.userId = payload.id;
      socket.userEmail = payload.email;
      socket.orgId = payload.org_id;
      
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