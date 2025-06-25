"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CTO at TechCorp",
      company: "TechCorp",
      image: "/placeholder.svg?height=60&width=60",
      content:
        "DITMail transformed our email workflow. The speed and reliability are unmatched, and the security features give us peace of mind.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Marketing Director",
      company: "GrowthLabs",
      image: "/placeholder.svg?height=60&width=60",
      content:
        "The collaboration features are game-changing. Our team productivity increased by 40% after switching to DITMail.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Founder",
      company: "StartupXYZ",
      image: "/placeholder.svg?height=60&width=60",
      content:
        "As a startup, we needed professional email that scales. DITMail delivered exactly what we needed at an affordable price.",
      rating: 5,
    },
    {
      name: "David Kim",
      role: "IT Manager",
      company: "Enterprise Inc",
      image: "/placeholder.svg?height=60&width=60",
      content:
        "The migration was seamless, and the enterprise security features exceed our compliance requirements. Highly recommended!",
      rating: 5,
    },
    {
      name: "Lisa Thompson",
      role: "Operations Manager",
      company: "ServicePro",
      image: "/placeholder.svg?height=60&width=60",
      content: "Customer support is exceptional. They helped us set up custom domains and integrations in no time.",
      rating: 5,
    },
    {
      name: "James Wilson",
      role: "CEO",
      company: "InnovateCo",
      image: "/placeholder.svg?height=60&width=60",
      content:
        "DITMail's analytics helped us understand our communication patterns and optimize our workflows significantly.",
      rating: 5,
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            Trusted by Teams Worldwide
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            See what our customers have to say about their DITMail experience
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">50K+</div>
            <div className="text-gray-600">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
            <div className="text-gray-600">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">1M+</div>
            <div className="text-gray-600">Emails Sent Daily</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">4.9/5</div>
            <div className="text-gray-600">Customer Rating</div>
          </div>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
            >
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>

              <Quote className="h-8 w-8 text-gray-300 mb-4" />

              <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.content}"</p>

              <div className="flex items-center">
                <img
                  src={testimonial.image || "/placeholder.svg"}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Join Thousands of Satisfied Customers</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience the difference that professional email can make for your business. Start your free trial today
            and see why teams choose DITMail.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
          >
            Start Your Free Trial
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
