"use client"

import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "CEO, TechStart Inc.",
    content:
      "DITMail has transformed our business communications. The custom domain feature and reliability are exactly what we needed.",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "IT Director, Global Solutions",
    content:
      "The migration was seamless and the support team was incredibly helpful. Our team productivity has increased significantly.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Marketing Manager, Creative Agency",
    content:
      "Love the clean interface and powerful features. The analytics help us track our email campaigns effectively.",
    rating: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Trusted by thousands of businesses</h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            See what our customers have to say about their experience with DITMail.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-gray-600 text-sm">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
