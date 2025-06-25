"use client"

import { motion } from "framer-motion"
import { Check, Star, ArrowLeft, Zap, Shield, Users } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/landing/Navbar"
import Footer from "@/components/landing/Footer"

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$5",
      period: "per user/month",
      description: "Perfect for small teams getting started",
      features: [
        "5 Custom Email Addresses",
        "10GB Storage per User",
        "Basic Email Features",
        "Mobile Apps",
        "Email Support",
        "Basic Analytics",
        "Spam Protection",
        "SSL Encryption",
      ],
      popular: false,
      color: "from-gray-600 to-gray-700",
      savings: null,
    },
    {
      name: "Professional",
      price: "$12",
      period: "per user/month",
      description: "Ideal for growing businesses",
      features: [
        "Unlimited Email Addresses",
        "100GB Storage per User",
        "Advanced Email Features",
        "Team Collaboration",
        "Priority Support",
        "Advanced Analytics",
        "Custom Domains",
        "API Access",
        "Email Templates",
        "Auto-responders",
        "Advanced Security",
        "Backup & Recovery",
      ],
      popular: true,
      color: "from-blue-600 to-purple-600",
      savings: "Save 20% annually",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact sales",
      description: "For large organizations with specific needs",
      features: [
        "Everything in Professional",
        "Unlimited Storage",
        "Advanced Security Features",
        "SSO Integration",
        "Dedicated Support",
        "Custom Integrations",
        "SLA Guarantee",
        "On-premise Deployment",
        "Advanced Compliance",
        "Custom Branding",
        "Dedicated Account Manager",
        "Training & Onboarding",
      ],
      popular: false,
      color: "from-purple-600 to-pink-600",
      savings: null,
    },
  ]

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast Performance",
      description: "Sub-second email delivery with global CDN",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and compliance",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Built-in tools for seamless teamwork",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <div className="pt-24 pb-16">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>

            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">Choose Your Perfect Plan</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start with a 14-day free trial. No credit card required. Upgrade or downgrade at any time.
            </p>
          </motion.div>

          {/* Pricing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex justify-center mb-12"
          >
            <div className="bg-gray-100 p-1 rounded-lg">
              <button className="px-6 py-2 rounded-md bg-white shadow-sm font-medium text-gray-900">Monthly</button>
              <button className="px-6 py-2 rounded-md font-medium text-gray-600 hover:text-gray-900">
                Annual (Save 20%)
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? "ring-2 ring-blue-500 scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600 ml-2">{plan.period}</span>
                    </div>
                    {plan.savings && <div className="mt-2 text-sm text-green-600 font-medium">{plan.savings}</div>}
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/mail"
                    className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {plan.name === "Enterprise" ? "Contact Sales" : "Start Free Trial"}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Features Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid md:grid-cols-3 gap-8 mb-20"
          >
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
                  <p className="text-gray-600">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately with
                    prorated billing.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h3>
                  <p className="text-gray-600">
                    No setup fees, no hidden costs. You only pay for what you use with transparent monthly billing.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">What about data migration?</h3>
                  <p className="text-gray-600">
                    We provide free migration assistance to help you move from your current email provider seamlessly.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h3>
                  <p className="text-gray-600">
                    Yes, we offer a 30-day money-back guarantee if you're not completely satisfied with DITMail.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                  <p className="text-gray-600">
                    We accept all major credit cards, PayPal, and bank transfers for enterprise customers.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Is my data secure?</h3>
                  <p className="text-gray-600">
                    Absolutely. We use bank-level encryption and are compliant with SOC 2, GDPR, and HIPAA standards.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
