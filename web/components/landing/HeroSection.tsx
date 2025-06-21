import Link from "next/link"
import { CheckIcon } from "@heroicons/react/20/solid"

export function HeroSection() {
  const features = [
    "Custom domain email addresses",
    "Advanced security & encryption",
    "IMAP/POP3 access",
    "7-day free trial",
  ]

  return (
    <div className="relative bg-white">
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8">
        <div className="px-6 pb-24 pt-10 sm:pb-32 lg:col-span-7 lg:px-0 lg:pb-56 lg:pt-48 xl:col-span-6">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Professional Email Hosting for Your Business
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Get custom domain email addresses with enterprise-grade security, seamless integration, and 24/7 support.
              Start your free trial today.
            </p>
            <div className="mt-8 space-y-4">
              {features.map((feature) => (
                <div key={feature} className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 flex items-center gap-x-6">
              <Link href="/auth/signup" className="btn-primary btn-lg">
                Start Free Trial
              </Link>
              <Link href="#features" className="text-sm font-semibold leading-6 text-gray-900">
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="relative lg:col-span-5 lg:-mr-8 xl:col-span-6">
          <img
            className="aspect-[3/2] w-full bg-gray-50 object-cover lg:aspect-[4/3] lg:h-[700px] xl:aspect-[16/10]"
            src="/images/hero-dashboard.png"
            alt="DITMail Dashboard"
          />
        </div>
      </div>
    </div>
  )
}
