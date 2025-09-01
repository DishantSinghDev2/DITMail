import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Branding from "@/models/Branding"
import Organization from "@/models/Organization"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { SessionUser } from "@/types";
import { asyncHandler } from "@/lib/error-handler"

export const GET = asyncHandler(async (request: NextRequest) => {

  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const branding = await Branding.findOne({ org_id: user.org_id })

  return NextResponse.json({ branding })
})

export const POST = asyncHandler(async (request: NextRequest) => {

  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "Only owners can manage branding" }, { status: 403 })
  }

  // Check if organization has Pro plan
  const org = await Organization.findById(user.org_id).populate("plan_id")
  if (!org || !org.plan_id.customizable) {
    return NextResponse.json({ error: "Custom branding requires Pro plan" }, { status: 403 })
  }

  const brandingData = await request.json()
  await connectDB()

  const branding = await Branding.findOneAndUpdate(
    { org_id: user.org_id },
    { ...brandingData, org_id: user.org_id },
    { upsert: true, new: true },
  )

  return NextResponse.json({ branding })
})
