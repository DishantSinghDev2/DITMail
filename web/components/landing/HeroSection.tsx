"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"
import Link from "next/link"

const benefits = ["7-day free trial", "No setup fees", "99.9% uptime guarantee", "24/7 support"]

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Professional Email
              <span className="text-blue-600"> Hosting</span>
              <br />
              for Your Business
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              Get custom domain email addresses, advanced security, and seamless integration with the tools you already
              use. Start your free trial today.
            </p>

            {/* Benefits */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="px-8 py-3" asChild>
                <Link href="/auth/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-3" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>

            <p className="mt-4 text-sm text-gray-500">No credit card required • Cancel anytime</p>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-900 mb-2">New Email</div>
                  <div className="space-y-2">
                    <div className="bg-blue-100 rounded p-2 text-xs">From: john@yourcompany.com</div>
                    <div className="bg-gray-200 rounded p-2 text-xs">To: client@example.com</div>
                    <div className="bg-gray-200 rounded p-2 text-xs">Subject: Welcome to our service!</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Send</div>
                  <div className="bg-gray-200 px-3 py-1 rounded text-xs">Draft</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
