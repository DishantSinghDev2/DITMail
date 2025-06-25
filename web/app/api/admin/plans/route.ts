import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Plan from "@/models/Plan"
import { getAuthUser } from "@/lib/auth"
import { logAuditEvent, AUDIT_ACTIONS, getRequestInfo } from "@/lib/audit"
import { asyncHandler } from "@/lib/error-handler"

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request)
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "Only system owners can manage plans" }, { status: 403 })
  }

  await connectDB()
  const plans = await Plan.find().sort({ price: 1 })

  return NextResponse.json({ plans })
})

export const POST = asyncHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request)
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "Only system owners can create plans" }, { status: 403 })
  }

  const planData = await request.json()
  await connectDB()

  const plan = new Plan(planData)
  await plan.save()

  const requestInfo = getRequestInfo(request)
  await logAuditEvent({
    user_id: user._id.toString(),
    action: AUDIT_ACTIONS.ORG_PLAN_CHANGED,
    details: { planId: plan._id, planName: plan.name },
    resource_type: "plan",
    resource_id: plan._id.toString(),
    org_id: user.org_id.toString(),
    ...requestInfo,
  })

  return NextResponse.json({ plan })
})
