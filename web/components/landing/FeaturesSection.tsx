"use client"

import { Shield, Zap, Globe, Users, BarChart3, Lock } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Advanced Security",
    description: "Enterprise-grade security with end-to-end encryption, spam filtering, and malware protection.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "High-performance email delivery with 99.9% uptime guarantee and global CDN.",
  },
  {
    icon: Globe,
    title: "Custom Domains",
    description: "Use your own domain for professional email addresses that build trust with customers.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Shared calendars, contacts, and seamless team communication tools.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Detailed insights into email performance, delivery rates, and user engagement.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Your data stays private. No ads, no tracking, complete control over your communications.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Everything you need for professional email</h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed for businesses of all sizes, from startups to enterprises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
