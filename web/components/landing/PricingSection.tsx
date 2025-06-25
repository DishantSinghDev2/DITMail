"use client"

import { motion } from "framer-motion"
import { Check, Star } from "lucide-react"
import Link from "next/link"

export default function PricingSection() {
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
      ],
      popular: false,
      color: "from-gray-600 to-gray-700",
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
      ],
      popular: true,
      color: "from-blue-600 to-purple-600",
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
      ],
      popular: false,
      color: "from-purple-600 to-pink-600",
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Choose the perfect plan for your team. All plans include a 14-day free trial with no credit card required.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
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

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20 text-center"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h4>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h4>
              <p className="text-gray-600">
                No setup fees, no hidden costs. You only pay for what you use with transparent monthly billing.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What about data migration?</h4>
              <p className="text-gray-600">
                We provide free migration assistance to help you move from your current email provider seamlessly.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h4>
              <p className="text-gray-600">
                Yes, we offer a 30-day money-back guarantee if you're not completely satisfied with DITMail.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
