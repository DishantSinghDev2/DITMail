"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BuildingOfficeIcon } from "@heroicons/react/24/outline"

interface OrganizationSetupProps {
  onNext: (data: any) => void
  onPrevious: () => void
  data: any
}

export default function OrganizationSetup({ onNext, onPrevious, data }: OrganizationSetupProps) {
  const [formData, setFormData] = useState({
    name: data.organization?.name || "",
    description: data.organization?.description || "",
    industry: data.organization?.industry || "",
    size: data.organization?.size || "",
    country: data.organization?.country || "",
  })
  const [loading, setLoading] = useState(false)

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Manufacturing",
    "Retail",
    "Consulting",
    "Non-profit",
    "Government",
    "Other",
  ]

  // fetch organization details from api on mount
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/organizations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
            const { organization } = await response.json()
            setFormData({
            name: organization.name || "",
            description: organization.description || "",
            industry: organization.industry || "",
            size: organization.size || "",
            country: organization.country || "",
            })
        } else {
          console.error("Failed to fetch organization details")
        }
      } catch (error) {
        console.error("Error fetching organization details:", error)
      }
    }
    
    fetchOrganization()
  }, [])

  const sizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem("accessToken")

      const response = await fetch("/api/organizations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const organization = await response.json()
        onNext({ organization })
      } else {
        throw new Error("Failed to create organization")
      }
    } catch (error) {
      console.error("Error creating organization:", error)
      alert("Failed to create organization. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <BuildingOfficeIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell us about your organization</h2>
        <p className="text-gray-600">This helps us customize DITMail for your needs</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Acme Corporation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select size</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size} employees
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="United States"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of your organization..."
            />
          </div>
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
            disabled={loading || !formData.name}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:shadow-lg transition-all duration-200"
          >
            {loading ? "Creating..." : "Continue"}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
