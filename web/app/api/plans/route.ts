import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Plan from "@/models/Plan"

export async function GET() {
  try {
    await connectDB()
    const plans = await Plan.find().sort({ price: 1 })
    return NextResponse.json({ plans })
  } catch (error) {
    console.error("Plans fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // This would be admin-only in production
    const planData = await request.json()
    await connectDB()

    const plan = new Plan(planData)
    await plan.save()

    return NextResponse.json({ plan })
  } catch (error) {
    console.error("Plan creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
