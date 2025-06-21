"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckIcon } from "@heroicons/react/20/solid"
import clsx from "clsx"

const plans = [
  {
    name: "Basic",
    id: "basic",
    price: { monthly: 3, yearly: 30 },
    description: "Perfect for small teams and startups",
    features: [
      "5 email accounts",
      "1 custom domain",
      "5GB storage per account",
      "IMAP/POP3 access",
      "Mobile apps",
      "Basic support",
      "Spam protection",
      "SSL encryption",
    ],
    mostPopular: false,
  },
  {
    name: "Professional",
    id: "professional",
    price: { monthly: 6, yearly: 60 },
    description: "Ideal for growing businesses",
    features: [
      "25 email accounts",
      "5 custom domains",
      "50GB storage per account",
      "Everything in Basic",
      "Calendar integration",
      "Contact management",
      "Advanced security",
      "Priority support",
      "Email aliases",
      "Auto-responders",
    ],
    mostPopular: true,
  },
  {
    name: "Enterprise",
    id: "enterprise",
    price: { monthly: 12, yearly: 120 },
    description: "For large organizations",
    features: [
      "Unlimited email accounts",
      "Unlimited domains",
      "1TB storage per account",
      "Everything in Professional",
      "Advanced admin controls",
      "API access",
      "SSO integration",
      "24/7 phone support",
      "Custom integrations",
      "Dedicated account manager",
    ],
    mostPopular: false,
  },
]

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  return (
    <div id="pricing" className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose the right plan for your business
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          Start with a 7-day free trial. No credit card required. Cancel anytime.
        </p>

        {/* Billing toggle */}
        <div className="mt-16 flex justify-center">
          <div className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs font-semibold leading-5 ring-1 ring-inset ring-gray-200">
            <button
              type="button"
              className={clsx(
                billingCycle === "monthly" ? "bg-blue-600 text-white" : "text-gray-500",
                "cursor-pointer rounded-full px-2.5 py-1",
              )}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly billing
            </button>
            <button
              type="button"
              className={clsx(
                billingCycle === "yearly" ? "bg-blue-600 text-white" : "text-gray-500",
                "cursor-pointer rounded-full px-2.5 py-1",
              )}
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly billing
            </button>
          </div>
        </div>

        {billingCycle === "yearly" && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-800">
              Save 17% with yearly billing
            </span>
          </div>
        )}

        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={clsx(
                plan.mostPopular ? "ring-2 ring-blue-600" : "ring-1 ring-gray-200",
                "rounded-3xl p-8 xl:p-10",
                "bg-white",
              )}
            >
              <div className="flex items-center justify-between gap-x-4">
                <h3 className={clsx("text-lg font-semibold leading-8", "text-gray-900")}>{plan.name}</h3>
                {plan.mostPopular ? (
                  <p className="rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-blue-600">
                    Most popular
                  </p>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">${plan.price[billingCycle]}</span>
                <span className="text-sm font-semibold leading-6 text-gray-600">
                  /{billingCycle === "monthly" ? "month" : "year"}
                </span>
              </p>
              <Link
                href={`/auth/signup?plan=${plan.id}&billing=${billingCycle}`}
                className={clsx(
                  plan.mostPopular
                    ? "bg-blue-600 text-white shadow-sm hover:bg-blue-500"
                    : "text-blue-600 ring-1 ring-inset ring-blue-200 hover:ring-blue-300",
                  "mt-6 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                )}
              >
                Start free trial
              </Link>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon className="h-6 w-5 flex-none text-blue-600" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
