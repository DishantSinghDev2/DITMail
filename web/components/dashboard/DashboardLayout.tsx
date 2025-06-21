"use client"

import type React from "react"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  EnvelopeIcon,
  UsersIcon,
  CogIcon,
  GlobeAltIcon,
  CreditCardIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline"
import { Logo } from "@/components/ui/Logo"
import clsx from "clsx"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Email", href: "/dashboard/email", icon: EnvelopeIcon },
  { name: "Users", href: "/dashboard/users", icon: UsersIcon },
  { name: "Domains", href: "/dashboard/domains", icon: GlobeAltIcon },
  { name: "Analytics", href: "/dashboard/analytics", icon: ChartBarIcon },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCardIcon },
  { name: "Settings", href: "/dashboard/settings", icon: CogIcon },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <div className="h-screen flex">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <Logo />
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-5 px-2">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      pathname === item.href
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      "group flex items-center px-2 py-2 text-sm font-medium border-l-4",
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={clsx(
                        pathname === item.href ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500",
                        "mr-3 h-6 w-6",
                      )}
                    />
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
              <Logo />
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      pathname === item.href
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      "group flex items-center px-2 py-2 text-sm font-medium border-l-4",
                    )}
                  >
                    <item.icon
                      className={clsx(
                        pathname === item.href ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500",
                        "mr-3 h-6 w-6",
                      )}
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {session?.user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{session?.user?.name}</p>
                  <button onClick={() => signOut()} className="text-xs text-gray-500 hover:text-gray-700">
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="lg:hidden">
          <div className="flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4">
            <button type="button" className="text-gray-500 hover:text-gray-600" onClick={() => setSidebarOpen(true)}>
              <Bars3Icon className="h-6 w-6" />
            </button>
            <Logo />
            <div className="h-6 w-6" /> {/* Spacer */}
          </div>
        </div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
