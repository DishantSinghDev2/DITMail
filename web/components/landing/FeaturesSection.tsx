"use client"

import { motion } from "framer-motion"
import {
  Shield,
  Zap,
  Globe,
  Users,
  Search,
  Smartphone,
  Lock,
  BarChart3,
  Mail,
  Cloud,
  Headphones,
  Workflow,
} from "lucide-react"

export default function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption, 2FA, and compliance with SOC 2, GDPR, and HIPAA standards.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Sub-second email delivery with global CDN and optimized infrastructure.",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: Globe,
      title: "Custom Domains",
      description: "Use your own domain with full DNS management and professional branding.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share emails, assign tasks, and collaborate seamlessly with your team.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Search,
      title: "Advanced Search",
      description: "Find any email instantly with AI-powered search and smart filters.",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Native mobile apps with offline support and push notifications.",
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: Lock,
      title: "Privacy Focused",
      description: "Your data stays private with zero-knowledge encryption and no tracking.",
      color: "from-gray-600 to-gray-700",
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Detailed analytics on email performance and team productivity.",
      color: "from-teal-500 to-green-500",
    },
    {
      icon: Cloud,
      title: "Unlimited Storage",
      description: "Never worry about storage limits with our scalable cloud infrastructure.",
      color: "from-sky-500 to-blue-500",
    },
    {
      icon: Workflow,
      title: "Automation",
      description: "Automate repetitive tasks with smart rules and AI-powered workflows.",
      color: "from-violet-500 to-purple-500",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Get help anytime with our dedicated support team and comprehensive docs.",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Mail,
      title: "API Integration",
      description: "Integrate with your existing tools using our comprehensive REST API.",
      color: "from-emerald-500 to-teal-500",
    },
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            Everything You Need for Professional Email
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            DITMail combines powerful features with enterprise-grade security to deliver the ultimate email experience
            for modern teams.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gray-200"
            >
              <div
                className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Email Experience?</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join thousands of teams who have already made the switch to DITMail. Start your free trial today and see
              the difference.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
            >
              Start Free Trial
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
