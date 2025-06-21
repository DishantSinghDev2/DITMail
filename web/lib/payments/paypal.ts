import paypal from "paypal-rest-sdk"

paypal.configure({
  mode: process.env.PAYPAL_MODE || "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID!,
  client_secret: process.env.PAYPAL_CLIENT_SECRET!,
})

export interface PayPalSubscriptionPlan {
  id: string
  name: string
  description: string
  type: "INFINITE" | "FIXED"
  payment_preferences: {
    auto_bill_outstanding: boolean
    setup_fee: {
      value: string
      currency_code: string
    }
    setup_fee_failure_action: "CONTINUE" | "CANCEL"
    payment_failure_threshold: number
  }
  taxes: {
    percentage: string
    inclusive: boolean
  }
}

export interface PayPalSubscription {
  id: string
  plan_id: string
  start_time: string
  quantity: string
  shipping_amount: {
    currency_code: string
    value: string
  }
  subscriber: {
    name: {
      given_name: string
      surname: string
    }
    email_address: string
  }
  application_context: {
    brand_name: string
    locale: string
    shipping_preference: "GET_FROM_FILE" | "NO_SHIPPING" | "SET_PROVIDED_ADDRESS"
    user_action: "SUBSCRIBE_NOW" | "CONTINUE"
    payment_method: {
      payer_selected: "PAYPAL"
      payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
    }
    return_url: string
    cancel_url: string
  }
}

export class PayPalService {
  async createBillingPlan(plan: {
    name: string
    description: string
    price: number
    currency: string
    interval: "MONTH" | "YEAR"
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const billingPlan = {
        name: plan.name,
        description: plan.description,
        type: "INFINITE",
        payment_definitions: [
          {
            name: `${plan.name} Payment`,
            type: "REGULAR",
            frequency: "MONTH",
            frequency_interval: plan.interval === "YEAR" ? "12" : "1",
            amount: {
              value: plan.price.toString(),
              currency: plan.currency,
            },
            cycles: "0", // Infinite
          },
        ],
        merchant_preferences: {
          auto_bill_amount: "YES",
          cancel_url: `${process.env.NEXTAUTH_URL}/billing/cancel`,
          return_url: `${process.env.NEXTAUTH_URL}/billing/success`,
          initial_fail_amount_action: "CONTINUE",
          max_fail_attempts: "3",
        },
      }

      paypal.billingPlan.create(billingPlan, (error, plan) => {
        if (error) {
          reject(error)
        } else {
          // Activate the plan
          const updateObject = [
            {
              op: "replace",
              path: "/",
              value: {
                state: "ACTIVE",
              },
            },
          ]

          paypal.billingPlan.update(plan.id, updateObject, (updateError) => {
            if (updateError) {
              reject(updateError)
            } else {
              resolve(plan.id)
            }
          })
        }
      })
    })
  }

  async createSubscription(
    planId: string,
    subscriberInfo: {
      name: string
      email: string
    },
  ): Promise<{ subscriptionId: string; approvalUrl: string }> {
    return new Promise((resolve, reject) => {
      const billingAgreement = {
        name: "DITMail Subscription",
        description: "Monthly subscription to DITMail service",
        start_date: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
        plan: {
          id: planId,
        },
        payer: {
          payment_method: "paypal",
        },
      }

      paypal.billingAgreement.create(billingAgreement, (error, agreement) => {
        if (error) {
          reject(error)
        } else {
          const approvalUrl = agreement.links.find((link: any) => link.rel === "approval_url")?.href

          resolve({
            subscriptionId: agreement.id,
            approvalUrl: approvalUrl || "",
          })
        }
      })
    })
  }

  async executeSubscription(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      paypal.billingAgreement.execute(token, {}, (error, agreement) => {
        if (error) {
          reject(error)
        } else {
          resolve(agreement)
        }
      })
    })
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cancelNote = {
        note: "Canceling the subscription",
      }

      paypal.billingAgreement.cancel(subscriptionId, cancelNote, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  async getSubscriptionDetails(subscriptionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      paypal.billingAgreement.get(subscriptionId, (error, agreement) => {
        if (error) {
          reject(error)
        } else {
          resolve(agreement)
        }
      })
    })
  }
}

export const paypalService = new PayPalService()
