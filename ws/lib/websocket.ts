import { Server, Socket } from "socket.io";
import { Redis } from "ioredis";
import { decode } from "next-auth/jwt";

// The secret remains the same
const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  org_id: string;
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

      socket.userId = payload.id;
      socket.userEmail = payload.email;
      socket.orgId = payload.org_id;

      console.log(`User ${socket.userEmail} passed authentication.`);
      next();
    });

    io.on("connection", (socket) => {
      const userId = socket.userId;
      const userEmail = socket.userEmail;

      console.log(`[Socket Setup] User ${userEmail} connected. Subscribing to channel: mailbox:events:${userEmail}`);

      socket.join(`user:${socket.userId}`);
      socket.join(`org:${socket.orgId}`);

      const subscriber = getRedisClient().duplicate();
      const mailChannel = `mailbox:events:${userEmail}`;
      const notificationChannel = `user-notifications:${userId}`;

      subscriber.subscribe(mailChannel, notificationChannel);
      console.log(`[Redis] Subscribed to '${mailChannel}' and '${notificationChannel}'`);

      subscriber.on("message", (channel, message) => {
        console.log(`[Redis] Message on channel '${channel}'.`);
        try {
          const event = JSON.parse(message);

          // --- ROUTE EVENT BASED ON TYPE ---
          if (event.type === 'delivery_failure') {
            socket.emit("delivery_failure_event", event);
            console.log(`[Socket Emit] Emitted 'delivery_failure_event' to user ${userId}`);
          } else {
            // Assume other messages are new mail events
            socket.emit("mailbox_event", event);
            console.log(`[Socket Emit] Emitted 'mailbox_event' to user ${userEmail}`);
          }

        } catch (e) {
          console.error("[Redis] Error parsing JSON:", e);
        }
      });

      subscriber.on("error", (err) => {
        console.error(`[Redis Subscriber Error] An error occurred with the Redis subscriber for ${userEmail}:`, err);
      });

      socket.on("disconnect", () => {
        console.log(`[Socket Teardown] User ${userEmail} disconnected.`);
        subscriber.unsubscribe();
        subscriber.quit();
      });

    });
  }
  return io;
}

export { io };