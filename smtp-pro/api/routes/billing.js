const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const mysql = require("mysql2/promise")
const redis = require("redis")
const paypal = require("paypal-rest-sdk")
const Razorpay = require("razorpay")

const router = express.Router()

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
})
redisClient.connect().catch(console.error)

// MySQL connection
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ditmail",
  port: process.env.DB_PORT || 3306,
}

// Configure PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
})

// Configure Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Get current subscription
router.get("/subscription", authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    const [subscriptions] = await connection.execute(
      `SELECT s.*, p.name as planName, p.price, p.features, p.limits
       FROM Subscription s
       JOIN Plan p ON s.planId = p.id
       WHERE s.organizationId = ? AND s.isActive = 1`,
      [req.user.organizationId],
    )

    await connection.end()

    if (subscriptions.length === 0) {
      return res.json({ subscription: null })
    }

    res.json({ subscription: subscriptions[0] })
  } catch (error) {
    console.error("Get subscription error:", error)
    res.status(500).json({ error: "Failed to fetch subscription" })
  }
})

// Get billing history
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const connection = await mysql.createConnection(dbConfig)

    const [payments] = await connection.execute(
      `SELECT p.*, pl.name as planName
       FROM Payment p
       LEFT JOIN Plan pl ON p.planId = pl.id
       WHERE p.organizationId = ?
       ORDER BY p.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.user.organizationId, Number.parseInt(limit), offset],
    )

    const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM Payment WHERE organizationId = ?`, [
      req.user.organizationId,
    ])

    await connection.end()

    res.json({
      payments,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    })
  } catch (error) {
    console.error("Get billing history error:", error)
    res.status(500).json({ error: "Failed to fetch billing history" })
  }
})

// Create subscription (PayPal)
router.post("/subscribe/paypal", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { planId, billingCycle = "monthly" } = req.body

    const connection = await mysql.createConnection(dbConfig)

    const [plans] = await connection.execute(`SELECT * FROM Plan WHERE id = ?`, [planId])

    if (plans.length === 0) {
      await connection.end()
      return res.status(404).json({ error: "Plan not found" })
    }

    const plan = plans[0]
    const amount = billingCycle === "yearly" ? plan.yearlyPrice : plan.price

    const paymentData = {
      intent: "subscription",
      payer: {
        payment_method: "paypal",
      },
      transactions: [
        {
          amount: {
            total: amount.toString(),
            currency: plan.currency,
          },
          description: `${plan.name} Plan - ${billingCycle} billing`,
        },
      ],
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/billing/success`,
        cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      },
    }

    paypal.payment.create(paymentData, async (error, payment) => {
      if (error) {
        console.error("PayPal error:", error)
        return res.status(500).json({ error: "Payment creation failed" })
      }

      // Store pending payment
      await connection.execute(
        `INSERT INTO Payment (organizationId, planId, amount, currency, provider, providerPaymentId, status, billingCycle, createdAt)
         VALUES (?, ?, ?, ?, 'paypal', ?, 'pending', ?, NOW())`,
        [req.user.organizationId, planId, amount, plan.currency, payment.id, billingCycle],
      )

      await connection.end()

      const approvalUrl = payment.links.find((link) => link.rel === "approval_url").href
      res.json({ approvalUrl, paymentId: payment.id })
    })
  } catch (error) {
    console.error("PayPal subscription error:", error)
    res.status(500).json({ error: "Subscription creation failed" })
  }
})

// Create subscription (Razorpay)
router.post("/subscribe/razorpay", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const { planId, billingCycle = "monthly" } = req.body

    const connection = await mysql.createConnection(dbConfig)

    const [plans] = await connection.execute(`SELECT * FROM Plan WHERE id = ?`, [planId])

    if (plans.length === 0) {
      await connection.end()
      return res.status(404).json({ error: "Plan not found" })
    }

    const plan = plans[0]
    const amount = billingCycle === "yearly" ? plan.yearlyPrice : plan.price

    const options = {
      amount: amount * 100, // Amount in paise
      currency: plan.currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        planId: planId,
        organizationId: req.user.organizationId,
        billingCycle: billingCycle,
      },
    }

    const order = await razorpay.orders.create(options)

    // Store pending payment
    await connection.execute(
      `INSERT INTO Payment (organizationId, planId, amount, currency, provider, providerPaymentId, status, billingCycle, createdAt)
       VALUES (?, ?, ?, ?, 'razorpay', ?, 'pending', ?, NOW())`,
      [req.user.organizationId, planId, amount, plan.currency, order.id, billingCycle],
    )

    await connection.end()

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error("Razorpay subscription error:", error)
    res.status(500).json({ error: "Subscription creation failed" })
  }
})

// Verify Razorpay payment
router.post("/verify/razorpay", authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    const crypto = require("crypto")
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id)
    const generated_signature = hmac.digest("hex")

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Update payment status
    await connection.execute(
      `UPDATE Payment SET status = 'completed', providerTransactionId = ?, completedAt = NOW()
       WHERE providerPaymentId = ? AND organizationId = ?`,
      [razorpay_payment_id, razorpay_order_id, req.user.organizationId],
    )

    // Get payment details
    const [payments] = await connection.execute(
      `SELECT * FROM Payment WHERE providerPaymentId = ? AND organizationId = ?`,
      [razorpay_order_id, req.user.organizationId],
    )

    if (payments.length > 0) {
      const payment = payments[0]

      // Create or update subscription
      const startDate = new Date()
      const endDate = new Date()
      if (payment.billingCycle === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      await connection.execute(
        `INSERT INTO Subscription (organizationId, planId, status, startDate, endDate, billingCycle, isActive, createdAt)
         VALUES (?, ?, 'active', ?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
         planId = VALUES(planId), status = VALUES(status), endDate = VALUES(endDate), 
         billingCycle = VALUES(billingCycle), isActive = 1, updatedAt = NOW()`,
        [req.user.organizationId, payment.planId, startDate, endDate, payment.billingCycle],
      )
    }

    await connection.end()

    // Clear organization cache
    await redisClient.del(`org:${req.user.organizationId}`)

    res.json({ message: "Payment verified successfully" })
  } catch (error) {
    console.error("Razorpay verification error:", error)
    res.status(500).json({ error: "Payment verification failed" })
  }
})

// Cancel subscription
router.post("/cancel", authenticateToken, requireRole(["ADMIN", "OWNER"]), async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig)

    await connection.execute(
      `UPDATE Subscription SET status = 'cancelled', isActive = 0, updatedAt = NOW()
       WHERE organizationId = ? AND isActive = 1`,
      [req.user.organizationId],
    )

    await connection.end()

    // Clear organization cache
    await redisClient.del(`org:${req.user.organizationId}`)

    res.json({ message: "Subscription cancelled successfully" })
  } catch (error) {
    console.error("Cancel subscription error:", error)
    res.status(500).json({ error: "Failed to cancel subscription" })
  }
})

module.exports = router
