"use client"

import { motion } from "framer-motion"
import { ArrowLeft, Users, Target, Award, Globe, Heart, Zap, Shield } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/landing/Navbar"
import Footer from "@/components/landing/Footer"

export default function AboutPage() {
  const team = [
    {
      name: "Dishant Singh",
      role: "CEO & Founder",
      image: "/placeholder.svg?height=200&width=200",
      bio: "Founder of DishIs Technologies. Passionate about building tools that help teams communicate better.",
    },
    {
      name: "Utkarsh Kumar",
      role: "CTO",
      image: "/placeholder.svg?height=200&width=200",
      bio: "Security expert with 1+ years in enterprise software. Leads our technical vision and infrastructure.",
    },
  ]

  const values = [
    {
      icon: Users,
      title: "Customer First",
      description: "Every decision we make starts with how it benefits our customers and their teams.",
    },
    {
      icon: Shield,
      title: "Security & Privacy",
      description: "We believe privacy is a fundamental right and security is non-negotiable.",
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We constantly push boundaries to deliver the best email experience possible.",
    },
    {
      icon: Heart,
      title: "Transparency",
      description: "We're open about our practices, pricing, and the challenges we face.",
    },
    {
      icon: Globe,
      title: "Global Impact",
      description: "Building tools that help teams worldwide communicate and collaborate better.",
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We strive for excellence in everything we do, from code quality to customer support.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>

            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">About DITMail</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're on a mission to revolutionize professional communication with fast, secure, and intuitive email
              solutions.
            </p>
          </motion.div>

          {/* Story Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid lg:grid-cols-2 gap-12 items-center mb-20"
          >
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  DITMail was born out of frustration with existing email solutions that were either too complex for
                  small teams or too expensive for growing businesses. We believed there had to be a better way.
                </p>
                <p>
                  Founded in 2023 by a team of engineers and designers who had worked at some of the world's largest
                  tech companies, we set out to build the email platform we wished we had.
                </p>
                <p>
                  Today, DITMail serves thousands of teams worldwide, from startups to Fortune 500 companies, helping
                  them communicate more effectively and securely than ever before.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src="/placeholder.svg?height=400&width=600"
                alt="DITMail team working"
                className="rounded-2xl shadow-lg"
              />
              <div className="absolute -bottom-6 -right-6 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl text-white">
                <div className="text-2xl font-bold">50K+</div>
                <div className="text-blue-100">Happy Users</div>
              </div>
            </div>
          </motion.div>

          {/* Mission & Vision */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-2 gap-8 mb-20"
          >
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <Target className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-600">
                To empower teams with professional email tools that are fast, secure, and delightfully simple to use. We
                believe great communication is the foundation of successful collaboration.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <Globe className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-600">
                A world where every team, regardless of size or budget, has access to enterprise-grade email tools that
                help them communicate better and achieve more together.
              </p>
            </div>
          </motion.div>

          {/* Values */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-20"
          >
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
                    <value.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Team */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-20"
          >
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Meet Our Team</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, index) => (
                <div key={index} className="text-center">
                  <img
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.bio}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Join Our Mission?</h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Whether you're looking to improve your team's communication or want to join our growing team, we'd love to
              hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/mail"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
              >
                Try DITMail Free
              </Link>
              <Link
                href="/contact"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200"
              >
                Get in Touch
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
