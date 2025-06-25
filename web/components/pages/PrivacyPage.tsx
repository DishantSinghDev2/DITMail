"use client"

import { motion } from "framer-motion"
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Globe } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/landing/Navbar"
import Footer from "@/components/landing/Footer"

export default function PrivacyPage() {
  const principles = [
    {
      icon: Lock,
      title: "Data Encryption",
      description: "All data is encrypted in transit and at rest using industry-standard encryption.",
    },
    {
      icon: Eye,
      title: "Transparency",
      description: "We're transparent about what data we collect and how we use it.",
    },
    {
      icon: UserCheck,
      title: "User Control",
      description: "You have full control over your data and can export or delete it anytime.",
    },
    {
      icon: Globe,
      title: "Global Compliance",
      description: "We comply with GDPR, CCPA, and other international privacy regulations.",
    },
  ]

  const sections = [
    {
      title: "Information We Collect",
      content: `We collect information you provide directly to us, such as:
      • Account information (name, email address, password)
      • Profile information (company, role, preferences)
      • Email content and metadata
      • Usage data and analytics
      • Payment information (processed securely by third-party providers)
      
      We also automatically collect certain information when you use our service:
      • Device information (IP address, browser type, operating system)
      • Usage patterns and feature interactions
      • Performance and error logs`,
    },
    {
      title: "How We Use Your Information",
      content: `We use the information we collect to:
      • Provide, maintain, and improve our services
      • Process transactions and send related information
      • Send technical notices, updates, and support messages
      • Respond to your comments, questions, and customer service requests
      • Monitor and analyze trends, usage, and activities
      • Detect, investigate, and prevent fraudulent transactions and other illegal activities
      • Personalize and improve your experience`,
    },
    {
      title: "Information Sharing and Disclosure",
      content: `We do not sell, trade, or otherwise transfer your personal information to third parties except:
      • With your explicit consent
      • To service providers who assist us in operating our service
      • To comply with legal obligations or protect our rights
      • In connection with a merger, acquisition, or sale of assets
      
      We require all third parties to respect the security of your personal data and treat it in accordance with the law.`,
    },
    {
      title: "Data Security",
      content: `We implement appropriate technical and organizational measures to protect your personal information:
      • End-to-end encryption for email content
      • Regular security audits and penetration testing
      • Access controls and authentication requirements
      • Secure data centers with physical security measures
      • Regular backups and disaster recovery procedures
      • Employee training on data protection and security`,
    },
    {
      title: "Data Retention",
      content: `We retain your information for as long as necessary to:
      • Provide our services to you
      • Comply with legal obligations
      • Resolve disputes and enforce agreements
      
      Email content: Retained until you delete it or close your account
      Account information: Retained for the duration of your account plus 30 days
      Usage data: Retained for up to 2 years for analytics purposes
      Payment information: Retained as required by financial regulations`,
    },
    {
      title: "Your Rights and Choices",
      content: `You have the following rights regarding your personal information:
      • Access: Request a copy of your personal data
      • Rectification: Correct inaccurate or incomplete data
      • Erasure: Request deletion of your personal data
      • Portability: Export your data in a machine-readable format
      • Restriction: Limit how we process your data
      • Objection: Object to certain types of processing
      
      To exercise these rights, please contact us at privacy@ditmail.com`,
    },
    {
      title: "International Data Transfers",
      content: `DITMail operates globally and may transfer your information to countries other than your own. We ensure appropriate safeguards are in place:
      • Standard Contractual Clauses approved by the European Commission
      • Adequacy decisions for certain countries
      • Other appropriate safeguards as required by applicable law`,
    },
    {
      title: "Children's Privacy",
      content: `Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.`,
    },
    {
      title: "Changes to This Privacy Policy",
      content: `We may update this Privacy Policy from time to time. We will notify you of any changes by:
      • Posting the new Privacy Policy on this page
      • Sending you an email notification
      • Providing notice through our service
      
      Changes become effective when posted unless otherwise specified.`,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>

            <div className="flex items-center justify-center mb-6">
              <Shield className="h-12 w-12 text-blue-600 mr-4" />
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Privacy Policy</h1>
            </div>
            <p className="text-lg text-gray-600">Last updated: December 2024</p>
          </motion.div>

          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8"
          >
            <p className="text-gray-700 mb-4">
              At DITMail, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our email hosting and collaboration services.
            </p>
            <p className="text-gray-700">
              By using DITMail, you agree to the collection and use of information in accordance with this policy.
            </p>
          </motion.div>

          {/* Privacy Principles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Our Privacy Principles</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {principles.map((principle, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-3">
                    <principle.icon className="h-6 w-6 text-blue-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">{principle.title}</h3>
                  </div>
                  <p className="text-gray-600">{principle.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Privacy Policy Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.05 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
                <div className="text-gray-700 whitespace-pre-line leading-relaxed">{section.content}</div>
              </motion.div>
            ))}
          </div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white text-center"
          >
            <h2 className="text-2xl font-bold mb-4">Questions About Your Privacy?</h2>
            <p className="text-blue-100 mb-6">
              If you have any questions about this Privacy Policy or our data practices, please contact our privacy
              team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:privacy@ditmail.com"
                className="inline-flex items-center bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
              >
                <Database className="h-5 w-5 mr-2" />
                privacy@ditmail.com
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200"
              >
                Contact Form
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
