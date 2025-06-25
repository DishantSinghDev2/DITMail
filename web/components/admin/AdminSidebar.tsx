"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, UsersIcon, GlobeAltIcon, CogIcon, DocumentTextIcon, ChartBarIcon } from "@heroicons/react/24/outline"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: HomeIcon },
  { name: "Users", href: "/admin/users", icon: UsersIcon },
  { name: "Domains", href: "/admin/domains", icon: GlobeAltIcon },
  { name: "Settings", href: "/admin/settings", icon: CogIcon },
  { name: "Audit Logs", href: "/admin/audit", icon: DocumentTextIcon },
  { name: "Analytics", href: "/admin/analytics", icon: ChartBarIcon },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
      </div>

      <nav className="mt-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-6 py-3 text-sm font-medium ${
                isActive ? "bg-blue-50 text-blue-700 border-r-4 border-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
        <Link href="/" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
          ← Back to Webmail
        </Link>
      </div>
    </div>
  )
}
