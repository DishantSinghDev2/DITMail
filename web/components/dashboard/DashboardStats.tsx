"use client"

import { useEffect, useState } from "react"
import { EnvelopeIcon, UsersIcon, ServerIcon, ChartBarIcon } from "@heroicons/react/24/outline"

interface Stats {
  totalEmails: number
  totalUsers: number
  storageUsed: string
  uptime: string
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalEmails: 0,
    totalUsers: 0,
    storageUsed: "0 GB",
    uptime: "99.9%",
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statItems = [
    {
      name: "Total Emails",
      value: isLoading ? "..." : stats.totalEmails.toLocaleString(),
      icon: EnvelopeIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: "Active Users",
      value: isLoading ? "..." : stats.totalUsers.toLocaleString(),
      icon: UsersIcon,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      name: "Storage Used",
      value: isLoading ? "..." : stats.storageUsed,
      icon: ServerIcon,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      name: "Uptime",
      value: isLoading ? "..." : stats.uptime,
      icon: ChartBarIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`p-3 rounded-md ${item.bgColor}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                  <dd className="text-lg font-medium text-gray-900">{item.value}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
