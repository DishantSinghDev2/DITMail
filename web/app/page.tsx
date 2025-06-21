import type { Metadata } from "next"
import { HeroSection } from "@/components/landing/HeroSection"
import { FeaturesSection } from "@/components/landing/FeaturesSection"
import { PricingSection } from "@/components/landing/PricingSection"
import { TestimonialsSection } from "@/components/landing/TestimonialsSection"
import { CTASection } from "@/components/landing/CTASection"
import { Header } from "@/components/landing/Header"
import { Footer } from "@/components/landing/Footer"

export const metadata: Metadata = {
  title: "DITMail - Professional Email Hosting for Your Business",
  description:
    "Get professional email hosting with custom domains, advanced security, and seamless integration. Start your 7-day free trial today.",
  keywords: "email hosting, custom domain email, business email, professional email, email service",
  openGraph: {
    title: "DITMail - Professional Email Hosting",
    description: "Professional email hosting with custom domains and advanced features",
    type: "website",
    url: "https://freecustom.email",
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
