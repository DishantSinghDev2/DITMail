"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Basic",
    price: 5,
    description: "Perfect for individuals and small teams",
    features: [
      "5 Email accounts",
      "10GB Storage per account",
      "Custom domain",
      "Basic spam protection",
      "IMAP/POP3 access",
      "Mobile app access",
      "24/7 support",
    ],
    popular: false,
  },
  {
    name: "Professional",
    price: 12,
    description: "Ideal for growing businesses",
    features: [
      "25 Email accounts",
      "50GB Storage per account",
      "Multiple custom domains",
      "Advanced spam protection",
      "IMAP/POP3 access",
      "Mobile app access",
      "Calendar & contacts sync",
      "Team collaboration tools",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 25,
    description: "For large organizations",
    features: [
      "Unlimited email accounts",
      "100GB Storage per account",
      "Unlimited custom domains",
      "Enterprise security",
      "IMAP/POP3 access",
      "Mobile app access",
      "Advanced calendar features",
      "Team collaboration tools",
      "Admin dashboard",
      "API access",
      "Dedicated support",
    ],
    popular: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your needs. All plans include a 7-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl border ${
                plan.popular ? "border-blue-500 shadow-lg scale-105" : "border-gray-200 shadow-sm"
              } bg-white p-8`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-900 hover:bg-gray-800"}`}
              >
                Start 7-day free trial
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
