"use client"

import { motion } from "framer-motion"
import { CheckCircleIcon, RocketLaunchIcon, EnvelopeIcon } from "@heroicons/react/24/outline"

interface OnboardingCompleteProps {
  onComplete: () => void
  data: any
}

export default function OnboardingComplete({ onComplete, data }: OnboardingCompleteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center max-w-2xl mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="mb-8"
      >
        <div className="w-24 h-24 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-bold text-gray-900 mb-4"
      >
        🎉 Welcome to DITMail!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-xl text-gray-600 mb-8"
      >
        Your enterprise email system is ready! Here's what we've set up for you:
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid md:grid-cols-2 gap-6 mb-8"
      >
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Organization</h3>
          <p className="text-sm text-gray-600">{data.organization?.name || "Your organization"} is configured</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Domain</h3>
          <p className="text-sm text-gray-600">{data.domain.domain ? `${data.domain.domain.domain} added` : "Can be added later"}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Team Members</h3>
          <p className="text-sm text-gray-600">{data.users?.length || 0} users created</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Profile</h3>
          <p className="text-sm text-gray-600">Preferences configured</p>
        </div>
      </motion.div>

      {data.domain && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8"
        >
          <h3 className="font-semibold text-yellow-900 mb-2">Next Steps for Domain Setup:</h3>
          <div className="text-left text-yellow-800 text-sm space-y-1">
            <p>1. Configure DNS records for {data.domain.domain.domain}</p>
            <p>2. Verify domain ownership</p>
            <p>3. Start receiving emails at your custom domain</p>
          </div>
          <p className="text-xs text-yellow-700 mt-2">You can find detailed DNS instructions in Settings → Domains</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="space-y-4"
      >
        <button
          onClick={onComplete}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 mx-auto"
        >
          <EnvelopeIcon className="w-5 h-5" />
          <span>Go to DITMail</span>
          <RocketLaunchIcon className="w-5 h-5" />
        </button>

        <p className="text-sm text-gray-500">You can always modify these settings later from your account settings</p>
      </motion.div>
    </motion.div>
  )
}
