import { Server, Socket } from "socket.io";
import { Redis } from "ioredis";
import { decode } from "next-auth/jwt";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  org_id: string;
}

async function verifyAndDecodeToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = await decode({
      token,
      secret: JWT_SECRET,
    });

    if (!decoded) return null;

    const { id, email, org_id } = decoded as Partial<JWTPayload>;
    if (!id || !email || !org_id) return null;

    return decoded as JWTPayload;
  } catch (err) {
    console.error("Token decoding error:", err);
    return null;
  }
}

let redis: Redis | null = null;
function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }
  return redis;
}

let io: Server | null = null;

declare module "socket.io" {
  interface Socket {
    userId: string;
    userEmail: string;
    orgId: string;
  }
}

export function initializeWebSocket(server: any): Server {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // --- Auth Middleware ---
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Auth error: No token"));
      }

      const payload = await verifyAndDecodeToken(token);
      if (!payload) {
        return next(new Error("Auth error: Invalid token"));
      }

      socket.userId = payload.id;
      socket.userEmail = payload.email;
      socket.orgId = payload.org_id;

      console.log(`user ${socket.userEmail} authenticated`);
      next();
    });

    io.on("connection", async (socket: Socket) => {
      const { userId, userEmail, orgId } = socket;

      console.log(`[Socket] User ${userEmail} connected`);
      socket.join(`user:${userId}`);
      socket.join(`org:${orgId}`);

      const subscriber = getRedisClient().duplicate();
      await subscriber.connect();

      const mailChannel = `mailbox:events:${userEmail}`;
      const notificationChannel = `user-notifications:${userId}`;

      await subscriber.subscribe(mailChannel);
      await subscriber.subscribe(notificationChannel);

      console.log(`[Redis] Subscribed to '${mailChannel}' & '${notificationChannel}'`);

      subscriber.on("message", (channel, message) => {
        console.log(`[Redis] Message on ${channel}`);
        try {
          const event = JSON.parse(message);

          if (event.type === "delivery_failure") {
            socket.emit("delivery_failure_event", event);
            console.log(`[Emit] delivery_failure_event → ${userId}`);
          } else {
            socket.emit("mailbox_event", event);
            console.log(`[Emit] mailbox_event → ${userEmail}`);
          }
        } catch (err) {
          console.error("[Redis] Failed to parse message:", err);
        }
      });

      subscriber.on("error", (err) => {
        console.error(`[Redis Error] Subscriber for ${userEmail}:`, err);
      });

      socket.on("disconnect", async () => {
        console.log(`[Socket] ${userEmail} disconnected`);
        try {
          await subscriber.unsubscribe(mailChannel);
          await subscriber.unsubscribe(notificationChannel);
        } catch (e) {
          console.error("[Redis] Error unsubscribing:", e);
        }
        await subscriber.quit();
      });
    });
  }
  return io;
}

export { io };
