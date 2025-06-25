import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/models/User"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Check if user belongs to this organization
    if (params.id !== decoded.organizationId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const users = await User.find({ organizationId: params.id })
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching organization users:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
