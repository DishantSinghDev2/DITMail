import { type NextRequest, NextResponse } from "next/server"
import { refreshAccessToken } from "@/lib/auth"
import { asyncHandler } from "@/lib/error-handler"

export const POST = asyncHandler(async (request: NextRequest) => {
  const { refreshToken } = await request.json()

  if (!refreshToken) {
    return NextResponse.json({ error: "Refresh token required" }, { status: 400 })
  }

  const tokens = await refreshAccessToken(refreshToken)

  if (!tokens) {
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 })
  }

  return NextResponse.json(tokens)
})
