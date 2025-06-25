"use client"

import { UsersIcon, GlobeAltIcon, EnvelopeIcon, CheckCircleIcon } from "@heroicons/react/24/outline"

interface DashboardStatsProps {
  stats: any
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  if (!stats) return null

  const statCards = [
    {
      name: "Total Users",
      value: stats.users || 0,
      icon: UsersIcon,
      color: "bg-blue-500",
    },
    {
      name: "Domains",
      value: stats.domains || 0,
      icon: GlobeAltIcon,
      color: "bg-green-500",
    },
    {
      name: "Messages Today",
      value: stats.messagesThisMonth || 0,
      icon: EnvelopeIcon,
      color: "bg-purple-500",
    },
    {
      name: "Verified Domains",
      value: stats.verifiedDomains || 0,
      icon: CheckCircleIcon,
      color: "bg-yellow-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`${stat.color} rounded-md p-3`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
