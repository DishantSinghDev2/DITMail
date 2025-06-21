"use client"

import type React from "react"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  PlusIcon,
  EnvelopeIcon,
  UsersIcon,
  GlobeAltIcon,
  CogIcon,
  DocumentTextIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline"
import Link from "next/link"

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  bgColor: string
}

const quickActions: QuickAction[] = [
  {
    id: "compose",
    title: "Compose Email",
    description: "Write a new email",
    icon: EnvelopeIcon,
    href: "/dashboard/email/compose",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "add-user",
    title: "Add User",
    description: "Create new email account",
    icon: UsersIcon,
    href: "/dashboard/users/new",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "add-domain",
    title: "Add Domain",
    description: "Configure new domain",
    icon: GlobeAltIcon,
    href: "/dashboard/domains/new",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Manage your account",
    icon: CogIcon,
    href: "/dashboard/settings",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Schedule meetings",
    icon: CalendarIcon,
    href: "/dashboard/calendar",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "templates",
    title: "Templates",
    description: "Email templates",
    icon: DocumentTextIcon,
    href: "/dashboard/email/templates",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
]

export function QuickActions() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    unreadEmails: 0,
    totalUsers: 0,
    activeDomains: 0,
  })

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="group flex items-center p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className={`flex-shrink-0 p-2 rounded-lg ${action.bgColor}`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">{action.title}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
              <PlusIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unread Emails</span>
              <span className="font-medium text-gray-900">{stats.unreadEmails}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Users</span>
              <span className="font-medium text-gray-900">{stats.totalUsers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Domains</span>
              <span className="font-medium text-gray-900">{stats.activeDomains}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h4>
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              <span className="font-medium">Welcome!</span> Complete your setup by adding a domain.
            </div>
            <Link href="/dashboard/domains/new" className="text-xs text-blue-600 hover:text-blue-500 font-medium">
              Add your first domain →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
