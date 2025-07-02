"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { UserCircleIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline"

interface ProfileSetupProps {
  onNext: (data: any) => void
  onPrevious: () => void
  data: any
  user: any
}

export default function ProfileSetup({ onNext, onPrevious }: ProfileSetupProps) {
  const [profile, setProfile] = useState({
    timezone: "UTC",
    language: "en",
    theme: "light",
    emailNotifications: true,
    desktopNotifications: true,
  })

  const [survey, setSurvey] = useState({
    primaryUse: "",
    teamSize: "",
    currentEmailProvider: "",
    importantFeatures: [],
    experience: "",
  })

  const [loading, setLoading] = useState(false)

  const primaryUses = [
    "Business Communication",
    "Customer Support",
    "Marketing Campaigns",
    "Internal Team Collaboration",
    "Client Communication",
    "Other",
  ]

  const features = [
    "Advanced Security",
    "Custom Domains",
    "Team Collaboration",
    "Mobile Access",
    "Integration APIs",
    "Analytics & Reporting",
    "Automation",
    "Large Attachments",
  ]

  const handleFeatureToggle = (feature: string) => {
    setSurvey((prev) => ({
      ...prev,
      importantFeatures: prev.importantFeatures.includes(feature)
        ? prev.importantFeatures.filter((f) => f !== feature)
        : [...prev.importantFeatures, feature],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem("accessToken")

      // Update user profile
      const profileResponse = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferences: profile,
          timezone: profile.timezone,
          language: profile.language,
        }),
      })

      if (!profileResponse.ok) {
        throw new Error("Failed to update profile")
      }

      // Save survey data
      const surveyResponse = await fetch("/api/onboarding/survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(survey),
      })

      if (!surveyResponse.ok) {
        console.warn("Failed to save survey data")
      }

      onNext({ profile, survey })
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Failed to save profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Personalize your experience</h2>
        <p className="text-gray-600">Set your preferences and help us understand your needs</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={profile.language}
                onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={profile.theme}
                onChange={(e) => setProfile({ ...profile, theme: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={profile.emailNotifications}
                onChange={(e) => setProfile({ ...profile, emailNotifications: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Email notifications for new messages</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={profile.desktopNotifications}
                onChange={(e) => setProfile({ ...profile, desktopNotifications: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Desktop notifications</span>
            </label>
          </div>
        </div>

        {/* Quick Survey */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center space-x-2 mb-4">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Survey</h3>
            <span className="text-xs text-gray-500">(Optional)</span>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What will you primarily use DITMail for?
              </label>
              <select
                value={survey.primaryUse}
                onChange={(e) => setSurvey({ ...survey, primaryUse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select primary use</option>
                {primaryUses.map((use) => (
                  <option key={use} value={use}>
                    {use}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your current email provider?
              </label>
              <input
                type="text"
                value={survey.currentEmailProvider}
                onChange={(e) => setSurvey({ ...survey, currentEmailProvider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Gmail, Outlook, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Which features are most important to you? (Select all that apply)
              </label>
              <div className="grid md:grid-cols-2 gap-3">
                {features.map((feature) => (
                  <label key={feature} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={survey.importantFeatures.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How would you describe your email management experience?
              </label>
              <select
                value={survey.experience}
                onChange={(e) => setSurvey({ ...survey, experience: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select experience level</option>
                <option value="beginner">Beginner - I use basic email features</option>
                <option value="intermediate">Intermediate - I use folders, filters, etc.</option>
                <option value="advanced">Advanced - I need enterprise features</option>
              </select>
            </div>
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
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:shadow-lg transition-all duration-200"
          >
            {loading ? "Saving..." : "Complete Setup"}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
