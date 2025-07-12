import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, refreshAccessToken, verifyToken, verifyRefreshToken } from "@/lib/auth"
import "@/models/Organization"

export async function GET(request: NextRequest) {
  try {
    const originalAccessToken = request.headers.get("authorization")?.replace("Bearer ", "")
    const refreshToken = request.headers.get("x-refresh-token")

    let user = null
    let accessTokenToSend = null
    let refreshTokenToSend = null

    // Try with original token
    if (originalAccessToken) {
      const payload = verifyToken(originalAccessToken)
      if (payload) {
        user = await getAuthUser(request)
      }
    }

    // If access token expired or invalid, try refreshing
    if (!user && refreshToken) {
      const newTokens = await refreshAccessToken(refreshToken)

      if (newTokens) {
        accessTokenToSend = newTokens.accessToken
        refreshTokenToSend = newTokens.refreshToken

        // Make a new request-like object to pass new token to getAuthUser
        const newRequest = new Request(request.url, {
          headers: {
            authorization: `Bearer ${newTokens.accessToken}`,
          },
        }) as unknown as NextRequest

        user = await getAuthUser(newRequest)
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const response = NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mailboxAccess: user.mailboxAccess,
        role: user.role,
        org_id: user.org_id,
        onboarding: user.onboarding,
      },
    })

    if (accessTokenToSend) {
      response.headers.set("x-access-token", accessTokenToSend)
    }
    if (refreshTokenToSend) {
      response.headers.set("x-refresh-token", refreshTokenToSend)
    }

    return response
  } catch (error) {
    console.error("Auth me error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
