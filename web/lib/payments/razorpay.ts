import Razorpay from "razorpay"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export interface RazorpaySubscriptionPlan {
  period: "daily" | "weekly" | "monthly" | "yearly"
  interval: number
  item: {
    name: string
    description: string
    amount: number
    currency: string
  }
}

export interface RazorpaySubscription {
  plan_id: string
  customer_id: string
  total_count: number
  quantity?: number
  start_at?: number
  expire_by?: number
  addons?: Array<{
    item: {
      name: string
      amount: number
      currency: string
    }
  }>
  notes?: Record<string, string>
  notify: {
    email: boolean
    sms: boolean
  }
}

export class RazorpayService {
  async createPlan(plan: {
    name: string
    description: string
    amount: number
    currency: string
    period: "monthly" | "yearly"
  }): Promise<string> {
    try {
      const razorpayPlan = await razorpay.plans.create({
        period: plan.period,
        interval: 1,
        item: {
          name: plan.name,
          description: plan.description,
          amount: plan.amount * 100, // Convert to paise
          currency: plan.currency,
        },
      })

      return razorpayPlan.id
    } catch (error) {
      console.error("Razorpay plan creation error:", error)
      throw error
    }
  }

  async createCustomer(customer: {
    name: string
    email: string
    contact?: string
  }): Promise<string> {
    try {
      const razorpayCustomer = await razorpay.customers.create({
        name: customer.name,
        email: customer.email,
        contact: customer.contact,
        fail_existing: 0,
      })

      return razorpayCustomer.id
    } catch (error) {
      console.error("Razorpay customer creation error:", error)
      throw error
    }
  }

  async createSubscription(subscription: {
    planId: string
    customerId: string
    totalCount?: number
    startAt?: Date
    expireBy?: Date
    notes?: Record<string, string>
  }): Promise<{ subscriptionId: string; shortUrl: string }> {
    try {
      const razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: subscription.planId,
        total_count: subscription.totalCount || 0, // 0 means infinite
        start_at: subscription.startAt ? Math.floor(subscription.startAt.getTime() / 1000) : undefined,
        expire_by: subscription.expireBy ? Math.floor(subscription.expireBy.getTime() / 1000) : undefined,
        notes: subscription.notes,
        customer_notify: true,
      })

      return {
        subscriptionId: razorpaySubscription.id,
        shortUrl: razorpaySubscription.short_url,
      }
    } catch (error) {
      console.error("Razorpay subscription creation error:", error)
      throw error
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd = true): Promise<void> {
    try {
      await razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
    } catch (error) {
      console.error("Razorpay subscription cancellation error:", error)
      throw error
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      return await razorpay.subscriptions.fetch(subscriptionId)
    } catch (error) {
      console.error("Razorpay subscription fetch error:", error)
      throw error
    }
  }

  async createPaymentLink(payment: {
    amount: number
    currency: string
    description: string
    customerId: string
    callbackUrl?: string
    callbackMethod?: "get" | "post"
  }): Promise<{ paymentLinkId: string; shortUrl: string }> {
    try {
      const paymentLink = await razorpay.paymentLink.create({
        amount: payment.amount * 100, // Convert to paise
        currency: payment.currency,
        description: payment.description,
        customer: {
          name: payment.customerId, // Replace with a valid property if needed
        },
        callback_url: payment.callbackUrl,
        callback_method: payment.callbackMethod || "get",
        expire_by: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000), // 24 hours
      })

      return {
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
      }
    } catch (error) {
      console.error("Razorpay payment link creation error:", error)
      throw error
    }
  }

  async verifyPaymentSignature(paymentId: string, orderId: string, signature: string): Promise<boolean> {
    try {
      const crypto = require("crypto")
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${orderId}|${paymentId}`)
        .digest("hex")

      return expectedSignature === signature
    } catch (error) {
      console.error("Razorpay signature verification error:", error)
      return false
    }
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      return await razorpay.payments.fetch(paymentId)
    } catch (error) {
      console.error("Razorpay payment fetch error:", error)
      throw error
    }
  }
}

export const razorpayService = new RazorpayService()
