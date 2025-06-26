"use client"

import { motion } from "framer-motion"
import { SparklesIcon, RocketLaunchIcon, ShieldCheckIcon } from "@heroicons/react/24/outline"

interface OnboardingWelcomeProps {
  onNext: () => void
  user: any
}

export default function OnboardingWelcome({ onNext, user }: OnboardingWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-2xl mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="mb-8"
      >
        <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <SparklesIcon className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-bold text-gray-900 mb-4"
      >
        Welcome to DITMail, {user?.name}! 🎉
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-xl text-gray-600 mb-8"
      >
        Let's get your enterprise email system set up in just a few minutes. We'll help you configure everything you
        need to get started.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid md:grid-cols-3 gap-6 mb-12"
      >
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <RocketLaunchIcon className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Quick Setup</h3>
          <p className="text-sm text-gray-600">Get up and running in under 5 minutes with our guided setup process.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <ShieldCheckIcon className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Enterprise Security</h3>
          <p className="text-sm text-gray-600">Bank-level security with end-to-end encryption and audit logging.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <SparklesIcon className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Custom Domain</h3>
          <p className="text-sm text-gray-600">Use your own domain for professional email addresses.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-blue-50 rounded-xl p-6 mb-8"
      >
        <h3 className="font-semibold text-blue-900 mb-2">What we'll set up:</h3>
        <ul className="text-left text-blue-800 space-y-1">
          <li>✓ Your organization details</li>
          <li>✓ Custom email domain</li>
          <li>✓ Team members and email accounts</li>
          <li>✓ Your profile and preferences</li>
          <li>✓ Quick survey to personalize your experience</li>
        </ul>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
      >
        Let's Get Started! 🚀
      </motion.button>
    </motion.div>
  )
}
