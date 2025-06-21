import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  selectedPlan: z.string().optional().default("basic"),
  billingCycle: z.string().optional().default("monthly"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 })
    }

    // Check if organization name is taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: validatedData.organizationName.toLowerCase().replace(/\s+/g, "-") },
    })

    if (existingOrg) {
      return NextResponse.json({ message: "Organization name is already taken" }, { status: 400 })
    }

    // Get the selected plan
    const plan = await prisma.plan.findUnique({
      where: { name: validatedData.selectedPlan.charAt(0).toUpperCase() + validatedData.selectedPlan.slice(1) },
    })

    if (!plan) {
      return NextResponse.json({ message: "Invalid plan selected" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Generate email verification token
    const emailVerificationToken = crypto.randomUUID()

    // Calculate trial end date
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + plan.trialDays)

    // Create user and organization in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: validatedData.organizationName,
          slug: validatedData.organizationName.toLowerCase().replace(/\s+/g, "-"),
          trialEndsAt: trialEnd,
          owner: {
            create: {
              name: validatedData.name,
              email: validatedData.email,
              password: hashedPassword,
              role: "ADMIN",
              emailVerificationToken,
            },
          },
        },
        include: {
          owner: true,
        },
      })

      // Create subscription
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: plan.id,
          status: "TRIAL",
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
          trialStart: new Date(),
          trialEnd,
          isYearly: validatedData.billingCycle === "yearly",
        },
      })

      return organization
    })

    // TODO: Send verification email
    // await sendVerificationEmail(validatedData.email, emailVerificationToken)

    return NextResponse.json({
      message: "Account created successfully",
      userId: result.owner.id,
      organizationId: result.id,
    })
  } catch (error) {
    console.error("Signup error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
