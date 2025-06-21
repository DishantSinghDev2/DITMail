import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 })
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as { email: string }

    // Find the user and update their email verification status
    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" }, { status: 400 })
    }

    // Update user's email verification status
    await prisma.user.update({
      where: { email: decoded.email },
      data: {
        emailVerified: new Date(),
      },
    })

    return NextResponse.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Email verification error:", error)

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 })
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
