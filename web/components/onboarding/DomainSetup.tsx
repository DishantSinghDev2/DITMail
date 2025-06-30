"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { GlobeAltIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline"

interface DomainSetupProps {
  onNext: (data: any) => void
  onPrevious: () => void
  data: any
}

export default function DomainSetup({ onNext, onPrevious, data }: DomainSetupProps) {
  const [domain, setDomain] = useState(data.domain?.domain || "")
  const [loading, setLoading] = useState(false)
  const [skipDomain, setSkipDomain] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingDomain, setExistingDomain] = useState(null)

  // Fetch existing domain if available
  useEffect(() => {
    const fetchDomain = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/domains", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const domainData = await response.json()
          if (domainData && domainData.domain) {
            setExistingDomain(domainData)
            setDomain(domainData.domain)
          }
        } else {
          const error = await response.json()
          setError(error.error || "Failed to fetch existing domain")
        }
      } catch (error: any) {
        console.error("Error fetching domain:", error)
        setError(error.message || "An unexpected error occurred")
      }
    }

    fetchDomain()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (skipDomain) {
      onNext({ domain: null })
      return
    }
    
    if (existingDomain) {
      onNext({ domain: existingDomain })
    }

    setLoading(true)

    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: domain.toLowerCase().trim() }),
      })

      if (response.ok) {
        const domainData = await response.json()
        onNext({ domain: domainData })
      } else {
        const error = await response.json()
        if (error.error) {
          setError(error.error)
        }
      }
    } catch (error: any) {
      console.error("Error adding domain:", error)
      setError(error.error || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <GlobeAltIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Add your custom domain</h2>
        <p className="text-gray-600">Use your own domain for professional email addresses</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
        <div className="flex items-start space-x-3 mb-4">
          <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">Benefits of custom domain:</h3>
            <ul className="text-sm text-gray-600 mt-1 space-y-1">
              <li>• Professional email addresses (you@yourcompany.com)</li>
              <li>• Enhanced brand credibility</li>
              <li>• Full control over your email infrastructure</li>
              <li>• Advanced security and compliance features</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-2">Domain Name</label>
          <div className="relative">
            <input
              type="text"
              value={domain}
              onChange={(e) => {
                // Basic validation to allow only valid domain characters
                const validDomain = e.target.value.replace(/[^a-zA-Z0-9.-]/g, "")
                setDomain(validDomain)
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="yourcompany.com"
              disabled={skipDomain}
            />
            {error && (
              <div className="mt-2 text-sm text-red-600">
                <ExclamationTriangleIcon className="inline w-4 h-4 mr-1" />
                {error}
              </div>
            )}
            {domain && <div className="mt-2 text-sm text-gray-600">Email addresses will be: user@{domain}</div>}
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> You'll need to configure DNS records after adding your domain. We'll provide
                detailed instructions in the next steps.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={skipDomain}
              onChange={(e) => setSkipDomain(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Skip domain setup for now</span>
              <p className="text-xs text-gray-600">You can add a custom domain later from settings</p>
            </div>
          </label>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onPrevious}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <button
            type="submit"
            disabled={loading || (!domain && !skipDomain)}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:shadow-lg transition-all duration-200"
          >
            {loading ? "Adding..." : skipDomain ? "Skip & Continue" : "Add Domain"}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
