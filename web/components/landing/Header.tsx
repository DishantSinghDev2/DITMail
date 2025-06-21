"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/Logo"
import { Menu, X } from "lucide-react"

const navigation = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Logo />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className="text-gray-700 hover:text-blue-600 transition-colors">
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/signin" className="text-gray-700 hover:text-blue-600 transition-colors">
              Sign In
            </Link>
            <Button asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-700 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <Link
                  href="/auth/signin"
                  className="block text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Button asChild className="w-full">
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
