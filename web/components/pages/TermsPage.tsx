"use client"

import { motion } from "framer-motion"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/landing/Navbar"
import Footer from "@/components/landing/Footer"

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing and using DITMail ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.`,
    },
    {
      title: "2. Description of Service",
      content: `DITMail provides professional email hosting and collaboration services. The service includes email accounts, storage, security features, and related tools as described on our website.`,
    },
    {
      title: "3. User Accounts",
      content: `You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password. You must notify us immediately of any unauthorized use of your account.`,
    },
    {
      title: "4. Acceptable Use Policy",
      content: `You agree not to use the service to:
      • Send spam or unsolicited bulk email
      • Violate any laws or regulations
      • Infringe on intellectual property rights
      • Transmit malicious software or code
      • Harass, abuse, or harm others
      • Impersonate others or provide false information`,
    },
    {
      title: "5. Privacy and Data Protection",
      content: `We are committed to protecting your privacy. Our Privacy Policy explains how we collect, use, and protect your information. By using our service, you consent to the collection and use of information as outlined in our Privacy Policy.`,
    },
    {
      title: "6. Service Availability",
      content: `We strive to maintain high service availability but cannot guarantee 100% uptime. We may perform maintenance that temporarily interrupts service. We will provide advance notice when possible.`,
    },
    {
      title: "7. Payment Terms",
      content: `Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law or as specifically stated in our refund policy. We may change our pricing with 30 days notice.`,
    },
    {
      title: "8. Data Backup and Recovery",
      content: `While we maintain regular backups of our systems, you are responsible for maintaining your own backups of important data. We are not liable for data loss except in cases of gross negligence.`,
    },
    {
      title: "9. Limitation of Liability",
      content: `DITMail shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.`,
    },
    {
      title: "10. Termination",
      content: `Either party may terminate this agreement at any time. Upon termination, your right to use the service ceases immediately. We may retain your data for a reasonable period to allow for data export.`,
    },
    {
      title: "11. Changes to Terms",
      content: `We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the service. Continued use of the service constitutes acceptance of modified terms.`,
    },
    {
      title: "12. Governing Law",
      content: `These terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.`,
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
              <FileText className="h-12 w-12 text-blue-600 mr-4" />
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Terms of Service</h1>
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
            <p className="text-gray-700">
              Welcome to DITMail. These Terms of Service ("Terms") govern your use of our email hosting and
              collaboration services. Please read these terms carefully before using our service.
            </p>
          </motion.div>

          {/* Terms Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + index * 0.05 }}
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
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white text-center"
          >
            <h2 className="text-2xl font-bold mb-4">Questions About These Terms?</h2>
            <p className="text-blue-100 mb-6">
              If you have any questions about these Terms of Service, please don't hesitate to contact us.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
            >
              Contact Us
            </Link>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
