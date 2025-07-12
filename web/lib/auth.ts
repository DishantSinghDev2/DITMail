import jwt from "jsonwebtoken"
import type { NextRequest } from "next/server"
import User from "@/models/User"
import connectDB from "./db"
import { redis } from "./redis"

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export interface JWTPayload {
  userId: string
  email: string
  orgId: string
  role: string
  sessionId: string
}

export function generateTokens(payload: Omit<JWTPayload, "sessionId">) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const fullPayload = { ...payload, sessionId }

  const accessToken = jwt.sign(fullPayload, JWT_SECRET, { expiresIn: "15m" })
  const refreshToken = jwt.sign(fullPayload, JWT_REFRESH_SECRET, { expiresIn: "7d" })

  // Store refresh token in Redis with expiration
  redis.setex(`refresh_token:${sessionId}`, 7 * 24 * 60 * 60, refreshToken)

  return { accessToken, refreshToken, sessionId }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken)
  if (!payload) return null

  // Check if refresh token exists in Redis
  const storedToken = await redis.get(`refresh_token:${payload.sessionId}`)
  if (!storedToken || storedToken !== refreshToken) return null

  // Generate new tokens
  const newTokens = generateTokens({
    userId: payload.userId,
    email: payload.email,
    orgId: payload.orgId,
    role: payload.role,
  })

  // Remove old refresh token
  await redis.del(`refresh_token:${payload.sessionId}`)

  return newTokens
}

export async function revokeSession(sessionId: string) {
  await redis.del(`refresh_token:${sessionId}`)
}

export async function getAuthUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  await connectDB()
  const user = await User.findById(payload.userId).populate("org_id")
  return user
}

export function requireRole(roles: string[]) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)

    if (!user || !roles.includes(user.role)) {
      return new Response("Forbidden", { status: 403 })
    }

    return user
  }
}
