import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "$5",
    period: "per user/month",
    description: "Perfect for small teams getting started",
    features: [
      "5GB storage per user",
      "Custom domain email",
      "Basic spam protection",
      "Mobile & desktop apps",
      "24/7 email support",
    ],
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$12",
    period: "per user/month",
    description: "Advanced features for growing businesses",
    features: [
      "25GB storage per user",
      "Advanced security features",
      "Calendar & contacts sync",
      "Team collaboration tools",
      "Priority phone support",
      "Email analytics",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$25",
    period: "per user/month",
    description: "Full-featured solution for large organizations",
    features: [
      "Unlimited storage",
      "Advanced admin controls",
      "Single sign-on (SSO)",
      "Data loss prevention",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    popular: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your business. All plans include a 7-day free trial.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? "ring-2 ring-blue-600 scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
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
                asChild
                className={`w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-900 hover:bg-gray-800"}`}
              >
                <Link href={`/auth/signup?plan=${plan.id}&billing=monthly`}>Start Free Trial</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">All plans include a 7-day free trial. No credit card required.</p>
        </div>
      </div>
    </section>
  )
}
