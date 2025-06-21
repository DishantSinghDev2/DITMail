"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  EnvelopeIcon,
  UsersIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline"

interface DashboardStat {
  id: string
  name: string
  value: string
  change: string
  changeType: "increase" | "decrease" | "neutral"
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export function DashboardStats() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchStats()
    }
  }, [session])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }

      const data = await response.json()

      const formattedStats: DashboardStat[] = [
        {
          id: "emails",
          name: "Total Emails",
          value: data.totalEmails?.toString() || "0",
          change: data.emailsChange || "+0%",
          changeType: data.emailsChange?.startsWith("+") ? "increase" : "decrease",
          icon: EnvelopeIcon,
          color: "text-blue-600",
        },
        {
          id: "users",
          name: "Active Users",
          value: data.activeUsers?.toString() || "0",
          change: data.usersChange || "+0%",
          changeType: data.usersChange?.startsWith("+") ? "increase" : "decrease",
          icon: UsersIcon,
          color: "text-green-600",
        },
        {
          id: "domains",
          name: "Domains",
          value: data.totalDomains?.toString() || "0",
          change: data.domainsChange || "+0%",
          changeType: data.domainsChange?.startsWith("+") ? "increase" : "decrease",
          icon: GlobeAltIcon,
          color: "text-purple-600",
        },
        {
          id: "storage",
          name: "Storage Used",
          value: data.storageUsed || "0 MB",
          change: data.storageChange || "+0%",
          changeType: data.storageChange?.startsWith("+") ? "increase" : "decrease",
          icon: ChartBarIcon,
          color: "text-orange-600",
        },
      ]

      setStats(formattedStats)
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error)
      // Set default stats on error
      setStats([
        {
          id: "emails",
          name: "Total Emails",
          value: "0",
          change: "+0%",
          changeType: "neutral",
          icon: EnvelopeIcon,
          color: "text-blue-600",
        },
        {
          id: "users",
          name: "Active Users",
          value: "0",
          change: "+0%",
          changeType: "neutral",
          icon: UsersIcon,
          color: "text-green-600",
        },
        {
          id: "domains",
          name: "Domains",
          value: "0",
          change: "+0%",
          changeType: "neutral",
          icon: GlobeAltIcon,
          color: "text-purple-600",
        },
        {
          id: "storage",
          name: "Storage Used",
          value: "0 MB",
          change: "+0%",
          changeType: "neutral",
          icon: ChartBarIcon,
          color: "text-orange-600",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-10"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                  <div
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      stat.changeType === "increase"
                        ? "text-green-600"
                        : stat.changeType === "decrease"
                          ? "text-red-600"
                          : "text-gray-500"
                    }`}
                  >
                    {stat.changeType === "increase" ? (
                      <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                    ) : stat.changeType === "decrease" ? (
                      <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                    ) : null}
                    <span className="sr-only">{stat.changeType === "increase" ? "Increased" : "Decreased"} by</span>
                    {stat.change}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
