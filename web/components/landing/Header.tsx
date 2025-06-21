"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline"
import { Logo } from "@/components/ui/Logo"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session } = useSession()

  const navigation = [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Support", href: "/support" },
    { name: "Documentation", href: "/docs" },
  ]

  return (
    <header className="bg-white shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between border-b border-gray-200 py-6 lg:border-none">
          <div className="flex items-center">
            <Link href="/">
              <Logo className="h-8 w-auto" />
            </Link>
            <div className="ml-10 hidden space-x-8 lg:block">
              {navigation.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-base font-medium text-gray-500 hover:text-gray-900"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="ml-10 space-x-4">
            {session ? (
              <Link href="/dashboard" className="btn-primary">
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="inline-block bg-white py-2 px-4 text-base font-medium text-gray-500 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link href="/auth/signup" className="btn-primary">
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
          <div className="ml-10 lg:hidden">
            <button
              type="button"
              className="-m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap justify-center space-x-6 py-4 lg:hidden">
          {navigation.map((link) => (
            <Link key={link.name} href={link.href} className="text-base font-medium text-gray-500 hover:text-gray-900">
              {link.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 right-0 w-full max-w-xs bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo className="h-8 w-auto" />
              <button
                type="button"
                className="-m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 space-y-6">
              {navigation.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="space-y-4">
                {session ? (
                  <Link href="/dashboard" className="btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/signin" className="btn-outline w-full" onClick={() => setMobileMenuOpen(false)}>
                      Sign in
                    </Link>
                    <Link href="/auth/signup" className="btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>
                      Start Free Trial
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
