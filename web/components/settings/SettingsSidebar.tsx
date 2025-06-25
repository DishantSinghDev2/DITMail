"use client"

import Link from "next/link"
import { UserIcon, BuildingOfficeIcon, GlobeAltIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"

interface SettingsSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user: any
}

export default function SettingsSidebar({ activeTab, onTabChange, user }: SettingsSidebarProps) {
  const tabs = [
    { id: "profile", name: "Profile", icon: UserIcon },
    { id: "organization", name: "Organization", icon: BuildingOfficeIcon, adminOnly: true },
    { id: "domains", name: "Domains", icon: GlobeAltIcon, adminOnly: true },
  ]

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
      </div>

      <nav className="mt-6">
        {tabs.map((tab) => {
          if (tab.adminOnly && !["owner", "admin"].includes(user.role)) {
            return null
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center px-6 py-3 text-left text-sm font-medium ${
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-700 border-r-4 border-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="h-5 w-5 mr-3" />
              {tab.name}
            </button>
          )
        })}
      </nav>

      <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
        <Link href="/" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Webmail
        </Link>
      </div>
    </div>
  )
}
