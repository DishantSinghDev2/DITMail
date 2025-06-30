"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import OnboardingWelcome from "@/components/onboarding/OnboardingWelcome"
import OrganizationSetup from "@/components/onboarding/OrganizationSetup"
import DomainSetup from "@/components/onboarding/DomainSetup"
import UserSetup from "@/components/onboarding/UserSetup"
import ProfileSetup from "@/components/onboarding/ProfileSetup"
import OnboardingComplete from "@/components/onboarding/OnboardingComplete"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import DomainVerification from "@/components/onboarding/DomainVerification"

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [onboardingData, setOnboardingData] = useState({
    organization: null,
    domain: null,
    users: [],
    profile: null,
    survey: null,
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/mail")
    }
  }, [user, loading, router])


  const steps = [
    { id: "welcome", title: "Welcome", component: OnboardingWelcome },
    { id: "organization", title: "Organization", component: OrganizationSetup },
    { id: "domain", title: "Domain", component: DomainSetup },
    { id: "domainVerification", title: "Domain Verification", component: DomainVerification },
    { id: "users", title: "Users", component: UserSetup },
    { id: "profile", title: "Profile", component: ProfileSetup },
    { id: "complete", title: "Complete", component: OnboardingComplete },
  ]

  const handleNext = (data?: any) => {
    if (data) {
      setOnboardingData((prev) => ({ ...prev, ...data }))
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleComplete = () => {
    router.push("/mail")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900">Setup DITMail</h1>
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="sm:flex hidden justify-between mt-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`text-xs ${index <= currentStep ? "text-blue-600 font-medium" : "text-gray-400"}`}
              >
                {step.title}
              </div>
            ))}
          </div>
          <div className="flex sm:hidden justify-center mt-2">
            <div
              className={`text-xs text-blue-600 font-medium`}
            >
              {steps[currentStep].title}
            </div>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <CurrentStepComponent
            onNext={handleNext}
            onPrevious={handlePrevious}
            onComplete={handleComplete}
            currentStep={currentStep}
            totalSteps={steps.length}
            data={onboardingData}
            user={user}
          />
        </div>
      </div>
    </div>
  )
}
