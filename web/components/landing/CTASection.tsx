"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-24 bg-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">Ready to get started?</h2>
        <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
          Join thousands of businesses that trust DITMail for their email hosting needs. Start your 7-day free trial
          today - no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
            Start Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
          >
            Contact Sales
          </Button>
        </div>
        <p className="text-blue-100 text-sm mt-4">7-day free trial • No setup fees • Cancel anytime</p>
      </div>
    </section>
  )
}
