"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  SunIcon,
  PaintBrushIcon,
  BellIcon,
  ComputerDesktopIcon,
  BriefcaseIcon,
  AtSymbolIcon,
  ShieldCheckIcon,
  UsersIcon,
  DevicePhoneMobileIcon,
  CodeBracketIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline"
import { toast } from "@/hooks/use-toast"
import { LoaderCircle } from "lucide-react"

// --- Type Definitions ---
interface ProfileSetupProps {
  onNext: (data: any) => void
  onPrevious: () => void
  data: any
  user: any
}

interface ProfileState {
  timezone: string
  language: string
  theme: "light" | "dark" | "auto"
  emailNotifications: boolean
  desktopNotifications: boolean
}

interface SurveyState {
  primaryUse: string
  currentEmailProvider: string
  importantFeatures: string[]
  experience: "beginner" | "intermediate" | "advanced" | ""
}

// --- Data and Mappings ---
const featuresMap: { [key: string]: React.ElementType } = {
  "Advanced Security": ShieldCheckIcon,
  "Custom Domains": AtSymbolIcon,
  "Team Collaboration": UsersIcon,
  "Mobile Access": DevicePhoneMobileIcon,
  "Integration APIs": CodeBracketIcon,
  "Analytics & Reporting": ChartBarIcon,
  "Automation": WrenchScrewdriverIcon,
  "Large Attachments": PaperAirplaneIcon,
}

// --- Sub-components ---
const CompletionScreen = () => (
  <motion.div
    key="completion"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="text-center py-16"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
    >
      <CheckIcon className="w-24 h-24 text-green-500 mx-auto mb-6 p-4 bg-green-50 rounded-full" />
    </motion.div>
    <h1 className="text-4xl font-bold text-gray-800 mb-3">You're All Set!</h1>
    <p className="text-lg text-gray-500">Personalizing your workspace...</p>
  </motion.div>
)

// --- Main Component ---
export default function ProfileSetup({ data, onNext, onPrevious }: ProfileSetupProps) {
  const [profile, setProfile] = useState<ProfileState>({
    timezone: "UTC",
    language: "en",
    theme: "light",
    emailNotifications: true,
    desktopNotifications: true,
  })

  const [survey, setSurvey] = useState<SurveyState>({
    primaryUse: "",
    teamSize: "",
    currentEmailProvider: "",
    importantFeatures: [],
    experience: "",
  })

  const [loading, setLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleFeatureToggle = (feature: string) => {
    setSurvey(prev => ({
      ...prev,
      importantFeatures: prev.importantFeatures.includes(feature)
        ? prev.importantFeatures.filter(f => f !== feature)
        : [...prev.importantFeatures, feature],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem("accessToken")
      
      const profilePromise = fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      })

      const surveyPromise = fetch("/api/onboarding/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(survey),
      })

      const [profileResponse, surveyResponse] = await Promise.all([profilePromise, surveyPromise])

      if (!profileResponse.ok) throw new Error("Failed to update profile.")
      if (!surveyResponse.ok) console.warn("Survey data failed to save.")
      
      setIsComplete(true)

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save your profile. Please try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        onNext({ ...data, profile, survey })
      }, 2500); // Wait for animation before proceeding
      return () => clearTimeout(timer);
    }
  }, [isComplete, onNext, profile, survey]);

  return (
    <AnimatePresence mode="wait">
      {isComplete ? (
        <CompletionScreen />
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Personalize Your Experience</h2>
            <p className="text-gray-500">Help us tailor DITMail to your needs.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Settings */}
            <div className="p-6 border-2 border-gray-200 rounded-lg bg-white">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-6">
                <UserCircleIcon className="w-6 h-6 mr-2 text-blue-600" />
                Profile Settings
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Timezone and Language can be added back here if needed */}
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <PaintBrushIcon className="w-4 h-4 mr-2" /> Theme
                  </label>
                  <div className="flex space-x-2">
                    {(["light", "dark", "auto"] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProfile({ ...profile, theme: t })}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                          profile.theme === t
                            ? "bg-blue-600 text-white shadow"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                   <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                     <BellIcon className="w-4 h-4 mr-2" /> Notifications
                  </label>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                     <span className="text-sm text-gray-800 flex items-center"><BellIcon className="w-4 h-4 mr-2"/> Email</span>
                     <button type="button" onClick={() => setProfile(p => ({...p, emailNotifications: !p.emailNotifications}))} className={`${profile.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                       <span className={`${profile.emailNotifications ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                     </button>
                  </div>
                   <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                     <span className="text-sm text-gray-800 flex items-center"><ComputerDesktopIcon className="w-4 h-4 mr-2"/> Desktop</span>
                     <button type="button" onClick={() => setProfile(p => ({...p, desktopNotifications: !p.desktopNotifications}))} className={`${profile.desktopNotifications ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                       <span className={`${profile.desktopNotifications ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                     </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Survey */}
            <div className="p-6 border-2 border-gray-200 rounded-lg bg-white">
               <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-1">
                <ChatBubbleLeftRightIcon className="w-6 h-6 mr-2 text-blue-600" />
                Tell Us About You
              </h3>
              <p className="text-sm text-gray-500 mb-6">(This helps us improve your experience)</p>
              <div className="space-y-8">
                <div>
                   <label className="block text-sm font-medium text-gray-600 mb-2">Which features are most important to you?</label>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {Object.entries(featuresMap).map(([feature, Icon]) => (
                       <button
                         key={feature}
                         type="button"
                         onClick={() => handleFeatureToggle(feature)}
                         className={`flex flex-col items-center justify-center text-center p-3 border-2 rounded-lg transition-all ${
                           survey.importantFeatures.includes(feature)
                             ? 'border-blue-600 bg-blue-50 text-blue-700'
                             : 'border-gray-200 bg-white hover:border-gray-300'
                         }`}
                       >
                         <Icon className="w-6 h-6 mb-1.5"/>
                         <span className="text-xs font-semibold">{feature}</span>
                       </button>
                     ))}
                   </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">How would you describe your email experience?</label>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {(["beginner", "intermediate", "advanced"] as const).map(exp => (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => setSurvey({...survey, experience: exp})}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                           survey.experience === exp ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                         <span className="font-semibold text-gray-800">{exp.charAt(0).toUpperCase() + exp.slice(1)}</span>
                         <p className="text-xs text-gray-500 mt-1">
                           {exp === 'beginner' && 'I use basic features.'}
                           {exp === 'intermediate' && 'I use folders, filters, etc.'}
                           {exp === 'advanced' && 'I need enterprise-level tools.'}
                         </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button type="button" onClick={onPrevious} className="text-sm font-semibold text-gray-600 hover:text-gray-800">Back</button>
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg disabled:opacity-50 transition-all"
              >
                {loading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
                {!loading && <ArrowRightIcon className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}