import { Header } from "@/components/landing/Header"
import { Footer } from "@/components/landing/Footer"
import { Mail, Users, Shield, Zap, Award, Globe } from "lucide-react"

export default function AboutPage() {
  const stats = [
    { label: "Active Users", value: "50,000+" },
    { label: "Emails Delivered", value: "10M+" },
    { label: "Countries Served", value: "120+" },
    { label: "Uptime", value: "99.9%" },
  ]

  const values = [
    {
      icon: Shield,
      title: "Security First",
      description: "We prioritize the security and privacy of your communications with enterprise-grade encryption.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Our infrastructure is optimized for speed, ensuring your emails are delivered instantly.",
    },
    {
      icon: Users,
      title: "Customer Focused",
      description: "Every decision we make is centered around providing the best experience for our users.",
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "With servers worldwide, we ensure reliable email delivery no matter where you are.",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20">
        {/* Hero Section */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">About DITMail</h1>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                Revolutionizing business communication with secure, reliable, and feature-rich email solutions.
              </p>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                <p className="text-lg text-gray-600 mb-6">
                  At DITMail, we believe that communication is the foundation of every successful business. Our mission
                  is to provide organizations of all sizes with professional, secure, and reliable email solutions that
                  empower teams to collaborate effectively.
                </p>
                <p className="text-lg text-gray-600">
                  Founded with the vision of making enterprise-grade email accessible to everyone, we've built a
                  platform that combines cutting-edge technology with intuitive design.
                </p>
              </div>
              <div className="bg-blue-50 p-8 rounded-2xl">
                <Mail className="w-16 h-16 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-4">Why Choose DITMail?</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center">
                    <Award className="w-5 h-5 text-blue-600 mr-3" />
                    99.9% uptime guarantee
                  </li>
                  <li className="flex items-center">
                    <Shield className="w-5 h-5 text-blue-600 mr-3" />
                    Enterprise-grade security
                  </li>
                  <li className="flex items-center">
                    <Users className="w-5 h-5 text-blue-600 mr-3" />
                    24/7 customer support
                  </li>
                  <li className="flex items-center">
                    <Globe className="w-5 h-5 text-blue-600 mr-3" />
                    Global infrastructure
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-blue-600 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-blue-100">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leadership Section */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Leadership Team</h2>
              <p className="text-xl text-gray-600">Meet the visionaries behind DITMail</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">DS</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Dishant Singh</h3>
                <p className="text-lg text-blue-600 mb-4">CEO & Founder</p>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  Dishant founded DishIs Technologies with a vision to democratize enterprise-grade communication tools.
                  With over a decade of experience in software development and business strategy, he leads our mission
                  to make professional email accessible to businesses of all sizes.
                </p>
                <div className="text-sm text-gray-500">
                  <p className="mb-2">
                    <strong>DishIs Technologies</strong> - Building the future of business communication
                  </p>
                  <p>
                    "Our goal is to empower every organization with the tools they need to communicate effectively and
                    securely in today's digital world."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
              <p className="text-xl text-gray-600">The principles that guide everything we do</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
