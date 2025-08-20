"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Menu, X, ChevronDown, Sparkles, Zap, Shield } from "lucide-react"
import Link from "next/link"
import { signIn } from "next-auth/react"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { name: "Home", href: "/" },
    {
      name: "Features",
      href: "#features",
      dropdown: [
        { name: "Email Management", href: "#features", icon: Mail, desc: "Advanced email organization" },
        { name: "Real-time Sync", href: "#features", icon: Zap, desc: "Instant synchronization" },
        { name: "Enterprise Security", href: "#features", icon: Shield, desc: "Bank-level protection" },
      ],
    },
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ]

  const logoVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.05,
      rotate: [0, -5, 5, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  }

  const navItemVariants = {
    initial: { y: 0 },
    hover: {
      y: -2,
      transition: { duration: 0.2, ease: "easeOut" },
    },
  }

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  }

  const mobileMenuVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    visible: {
      opacity: 1,
      height: "auto",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  }

  const buttonVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.05,
      boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)",
      transition: { duration: 0.2 },
    },
    tap: { scale: 0.98 },
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg shadow-gray-900/5"
            : "bg-white/80 backdrop-blur-md border-b border-gray-200/30"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <motion.div variants={logoVariants} initial="initial" whileHover="hover" className="relative">
                <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-2.5 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Mail className="h-6 w-6 text-white" />
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </motion.div>
              <div className="flex flex-col">
                <motion.span
                  className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  DITMail
                </motion.span>
                <motion.span
                  className="text-xs text-gray-500 -mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Enterprise Email
                </motion.span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item, index) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => item.dropdown && setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <motion.div variants={navItemVariants} initial="initial" whileHover="hover" custom={index}>
                    <Link
                      href={item.href}
                      className="flex items-center space-x-1 px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200 font-medium group relative overflow-hidden"
                    >
                      <span className="relative z-10">{item.name}</span>
                      {item.dropdown && (
                        <motion.div
                          animate={{ rotate: activeDropdown === item.name ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </motion.div>
                      )}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg"
                        initial={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    </Link>
                  </motion.div>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {item.dropdown && activeDropdown === item.name && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="absolute top-full left-0 mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden"
                      >
                        <div className="p-2">
                          {item.dropdown.map((dropItem, idx) => (
                            <motion.div
                              key={dropItem.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                            >
                              <Link
                                href={dropItem.href}
                                className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 group"
                              >
                                <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-2 rounded-lg group-hover:scale-110 transition-transform duration-200">
                                  <dropItem.icon className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {dropItem.name}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">{dropItem.desc}</div>
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="#"
                  onClick={() => signIn('wyi')}
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium rounded-lg hover:bg-gray-50"
                >
                  Sign In
                </Link>
              </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/mail"
                  className=" text-blue-600 rounded-xl font-medium px-4 py-2"
                >
                  <span className="relative z-10 flex items-center space-x-2">
                  <span>Get Started</span>
                  <Sparkles className="h-4 w-4" />
                  </span>
                </Link>
                </motion.div>
            </div>

            {/* Mobile menu button */}
            <motion.button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="h-6 w-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                variants={mobileMenuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="md:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-xl"
              >
                <div className="py-4 space-y-2">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={item.href}
                        className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200 rounded-lg mx-2"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  ))}
                  <div className="pt-4 px-2 space-y-3">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Link
                        href="/mail"
                        className="block w-full text-center py-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-all duration-200 rounded-lg"
                        onClick={() => setIsOpen(false)}
                      >
                        Sign In
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Link
                        href="/mail"
                        className="block w-full text-center bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                        onClick={() => setIsOpen(false)}
                      >
                        Get Started
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Backdrop for mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
