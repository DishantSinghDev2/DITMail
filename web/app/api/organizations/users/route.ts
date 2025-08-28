import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import User from "@/models/User"
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { SessionUser } from "@/types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

   
       const session = await getServerSession(authOptions);
       const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Check if user belongs to this organization
    if (params.id !== user.org_id) {
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
