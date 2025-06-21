import { prisma } from "./prisma"
import { paypalService } from "./payments/paypal"
import { razorpayService } from "./payments/razorpay"
import type { PaymentMethod } from "@prisma/client"

export interface CreateSubscriptionOptions {
  organizationId: string
  planId: string
  paymentMethod: PaymentMethod
  isYearly: boolean
  customerInfo: {
    name: string
    email: string
    country?: string
  }
}

export interface SubscriptionResult {
  subscriptionId: string
  paymentUrl: string
  trialEnd?: Date
}

export class SubscriptionService {
  async createSubscription(options: CreateSubscriptionOptions): Promise<SubscriptionResult> {
    const { organizationId, planId, paymentMethod, isYearly, customerInfo } = options

    // Get plan details
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      throw new Error("Plan not found")
    }

    // Calculate trial end date
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + plan.trialDays)

    // Calculate subscription amount
    const amount = isYearly ? Number(plan.yearlyPrice) || Number(plan.price) * 12 : Number(plan.price)

    let paymentProviderId: string
    let paymentUrl: string

    if (paymentMethod === "PAYPAL") {
      // Create PayPal subscription
      const paypalPlanId = await this.getOrCreatePayPalPlan(plan, isYearly)
      const result = await paypalService.createSubscription(paypalPlanId, {
        name: customerInfo.name,
        email: customerInfo.email,
      })

      paymentProviderId = result.subscriptionId
      paymentUrl = result.approvalUrl
    } else if (paymentMethod === "RAZORPAY") {
      // Create Razorpay subscription
      const customerId = await razorpayService.createCustomer({
        name: customerInfo.name,
        email: customerInfo.email,
      })

      const razorpayPlanId = await this.getOrCreateRazorpayPlan(plan, isYearly)
      const result = await razorpayService.createSubscription({
        planId: razorpayPlanId,
        customerId,
        notes: {
          organizationId,
          planId,
        },
      })

      paymentProviderId = result.subscriptionId
      paymentUrl = result.shortUrl
    } else {
      throw new Error("Unsupported payment method")
    }

    // Create subscription in database
    const subscription = await prisma.subscription.create({
      data: {
        organizationId,
        planId,
        status: "TRIAL",
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
        trialStart: new Date(),
        trialEnd,
        isYearly,
        paymentMethod,
        paymentProviderId,
        paymentProviderSubscriptionId: paymentProviderId,
      },
    })

    return {
      subscriptionId: subscription.id,
      paymentUrl,
      trialEnd,
    }
  }

  async activateSubscription(subscriptionId: string, paymentToken?: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    })

    if (!subscription) {
      throw new Error("Subscription not found")
    }

    let paymentDetails: any

    if (subscription.paymentMethod === "PAYPAL" && paymentToken) {
      // Execute PayPal subscription
      paymentDetails = await paypalService.executeSubscription(paymentToken)
    } else if (subscription.paymentMethod === "RAZORPAY") {
      // Get Razorpay subscription details
      paymentDetails = await razorpayService.getSubscription(subscription.paymentProviderSubscriptionId!)
    }

    // Calculate next billing period
    const currentPeriodStart = new Date()
    const currentPeriodEnd = new Date()

    if (subscription.isYearly) {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "ACTIVE",
        currentPeriodStart,
        currentPeriodEnd,
      },
    })

    // Create payment record
    await prisma.payment.create({
      data: {
        subscriptionId,
        amount: subscription.isYearly
          ? Number(subscription.plan.yearlyPrice) || Number(subscription.plan.price) * 12
          : subscription.plan.price,
        currency: subscription.plan.currency,
        status: "COMPLETED",
        paymentMethod: subscription.paymentMethod as PaymentMethod,
        paymentProviderId: subscription.paymentProviderId!,
        paymentProviderPaymentId: paymentDetails?.id,
        paidAt: new Date(),
      },
    })
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!subscription) {
      throw new Error("Subscription not found")
    }

    // Cancel with payment provider
    if (subscription.paymentMethod === "PAYPAL") {
      await paypalService.cancelSubscription(subscription.paymentProviderSubscriptionId!)
    } else if (subscription.paymentMethod === "RAZORPAY") {
      await razorpayService.cancelSubscription(subscription.paymentProviderSubscriptionId!)
    }

    // Update subscription in database
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        cancelAtPeriodEnd: true,
      },
    })
  }

  private async getOrCreatePayPalPlan(plan: any, isYearly: boolean): Promise<string> {
    const planName = `${plan.name} - ${isYearly ? "Yearly" : "Monthly"}`
    const amount = isYearly ? plan.yearlyPrice || plan.price * 12 : plan.price

    return await paypalService.createBillingPlan({
      name: planName,
      description: plan.description,
      price: Number(amount),
      currency: plan.currency,
      interval: isYearly ? "YEAR" : "MONTH",
    })
  }

  private async getOrCreateRazorpayPlan(plan: any, isYearly: boolean): Promise<string> {
    const planName = `${plan.name} - ${isYearly ? "Yearly" : "Monthly"}`
    const amount = isYearly ? plan.yearlyPrice || plan.price * 12 : plan.price

    return await razorpayService.createPlan({
      name: planName,
      description: plan.description,
      amount: Number(amount),
      currency: plan.currency,
      period: isYearly ? "yearly" : "monthly",
    })
  }
}

export const subscriptionService = new SubscriptionService()
