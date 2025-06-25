"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Send, Inbox, Search, Users, Zap } from "lucide-react"

export default function AnimatedDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  const demoSteps = [
    {
      title: "Lightning Fast Compose",
      description: "Write emails with smart autocomplete and instant sending",
      icon: Send,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Intelligent Organization",
      description: "Auto-categorize emails with AI-powered sorting",
      icon: Inbox,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Advanced Search",
      description: "Find any email instantly with powerful search",
      icon: Search,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Team Collaboration",
      description: "Share emails and collaborate seamlessly",
      icon: Users,
      color: "from-orange-500 to-orange-600",
    },
  ]

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % demoSteps.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [isPlaying, demoSteps.length])

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            See DITMail in Action
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Experience the difference with our interactive demo
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Demo Controls */}
          <div className="space-y-6">
            {demoSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                  currentStep === index
                    ? "bg-white shadow-lg border-2 border-blue-200"
                    : "bg-white/50 hover:bg-white hover:shadow-md"
                }`}
                onClick={() => {
                  setCurrentStep(index)
                  setIsPlaying(false)
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${step.color}`}>
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                  {currentStep === index && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 bg-blue-500 rounded-full"
                    />
                  )}
                </div>
              </motion.div>
            ))}

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              {isPlaying ? (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1 }}
                    className="w-2 h-2 bg-blue-500 rounded-full"
                  />
                  <span>Auto-playing demo</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span>Click to auto-play</span>
                </>
              )}
            </button>
          </div>

          {/* Animated Demo Screen */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Mock Browser Header */}
              <div className="bg-gray-100 px-4 py-3 flex items-center space-x-2">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                </div>
                <div className="flex-1 bg-white rounded px-3 py-1 text-sm text-gray-500">mail.ditmail.com</div>
              </div>

              {/* Demo Content */}
              <div className="h-96 p-6 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="h-full"
                  >
                    {currentStep === 0 && <ComposeDemo />}
                    {currentStep === 1 && <InboxDemo />}
                    {currentStep === 2 && <SearchDemo />}
                    {currentStep === 3 && <CollaborationDemo />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, 0],
              }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 4,
                ease: "easeInOut",
              }}
              className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl shadow-lg"
            >
              <Mail className="h-6 w-6 text-white" />
            </motion.div>

            <motion.div
              animate={{
                y: [0, 10, 0],
                rotate: [0, -5, 0],
              }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 3,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -bottom-4 -left-4 bg-gradient-to-r from-green-500 to-blue-500 p-3 rounded-xl shadow-lg"
            >
              <Zap className="h-6 w-6 text-white" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Demo Components
function ComposeDemo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">New Message</h3>
        <Send className="h-5 w-5 text-blue-500" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 w-12">To:</span>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: 0.5 }}
            className="bg-gray-100 rounded px-2 py-1 text-sm"
          >
            team@company.com
          </motion.div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 w-12">Subject:</span>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: 1 }}
            className="bg-gray-100 rounded px-2 py-1 text-sm"
          >
            Project Update - Q4 Results
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="bg-gray-50 rounded-lg p-4 h-32 text-sm text-gray-600"
        >
          Hi team,
          <br />
          <br />I wanted to share our Q4 results...
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"
          />
        </motion.div>
      </div>
    </div>
  )
}

function InboxDemo() {
  const emails = [
    { from: "Sarah Johnson", subject: "Meeting Notes", time: "2m ago", unread: true },
    { from: "Marketing Team", subject: "Campaign Results", time: "1h ago", unread: true },
    { from: "IT Support", subject: "System Maintenance", time: "3h ago", unread: false },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Inbox</h3>
        <Inbox className="h-5 w-5 text-green-500" />
      </div>
      <div className="space-y-2">
        {emails.map((email, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            className={`p-3 rounded-lg border ${
              email.unread ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {email.unread && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                <div>
                  <div className="font-medium text-sm">{email.from}</div>
                  <div className="text-sm text-gray-600">{email.subject}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">{email.time}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SearchDemo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Search Results</h3>
        <Search className="h-5 w-5 text-purple-500" />
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <motion.input
          initial={{ width: "50%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.8 }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="project update"
          value="project update"
          readOnly
        />
      </motion.div>
      <div className="space-y-2">
        {[1, 2, 3].map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="p-3 bg-purple-50 border border-purple-200 rounded-lg"
          >
            <div className="text-sm font-medium">Found in: Q4 Project Update</div>
            <div className="text-xs text-gray-600 mt-1">
              ...the <span className="bg-yellow-200">project update</span> shows significant progress...
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function CollaborationDemo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Team Collaboration</h3>
        <Users className="h-5 w-5 text-orange-500" />
      </div>
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-orange-50 border border-orange-200 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">
              SJ
            </div>
            <span className="text-sm font-medium">Sarah shared an email</span>
          </div>
          <div className="text-sm text-gray-600">"Budget Proposal - Q1 2024" shared with Marketing Team</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
              MT
            </div>
            <span className="text-sm font-medium">Mike added a comment</span>
          </div>
          <div className="text-sm text-gray-600">
            "Great proposal! Let's discuss the timeline in tomorrow's meeting."
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-green-50 border border-green-200 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
              AL
            </div>
            <span className="text-sm font-medium">Anna approved</span>
          </div>
          <div className="text-sm text-gray-600">Email approved and ready for client presentation</div>
        </motion.div>
      </div>
    </div>
  )
}
