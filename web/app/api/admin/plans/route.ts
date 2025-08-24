import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import Plan from "@/models/Plan"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { logAuditEvent, AUDIT_ACTIONS, getRequestInfo } from "@/lib/audit"
import { asyncHandler } from "@/lib/error-handler"

export const GET = asyncHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
    const user = session?.user
    if (!user || !["owner"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

  await connectDB()
  const plans = await Plan.find().sort({ price: 1 })

  return NextResponse.json({ plans })
})

export const POST = asyncHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
    const user = session?.user
    if (!user || !["owner"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

  const planData = await request.json()
  await connectDB()

  const plan = new Plan(planData)
  await plan.save()

  const requestInfo = getRequestInfo(request)
  await logAuditEvent({
    user_id: user.id.toString(),
    action: AUDIT_ACTIONS.ORG_PLAN_CHANGED,
    details: { planId: plan._id, planName: plan.name },
    resource_type: "plan",
    resource_id: plan._id.toString(),
    org_id: user.org_id.toString(),
    ...requestInfo,
  })

  return NextResponse.json({ plan })
})
