"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Navbar from "./Navbar"
import HeroSection from "./HeroSection"
import FeaturesSection from "./FeaturesSection"
import AnimatedDemo from "./AnimatedDemo"
import PricingSection from "./PricingSection"
import TestimonialsSection from "./TestimonialsSection"
import Footer from "./Footer"

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: isVisible ? 1 : 0 }} transition={{ duration: 0.8 }}>
        <HeroSection />
        <AnimatedDemo />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <Footer />
      </motion.div>
    </div>
  )
}
