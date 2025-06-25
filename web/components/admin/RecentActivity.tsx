"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  UserIcon,
  EnvelopeIcon,
  TrashIcon,
  StarIcon,
  FolderIcon,
  CogIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"

interface ActivityItem {
  _id: string
  user_id: string
  user_name: string
  user_email: string
  action: string
  details: any
  ip: string
  user_agent: string
  created_at: string
}

interface RecentActivityProps {
  limit?: number
  refreshInterval?: number
}

export default function RecentActivity({ limit = 10, refreshInterval = 30000 }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, refreshInterval)
    return () => clearInterval(interval)
  }, [limit, filter, refreshInterval])

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem("accessToken")
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(filter !== "all" && { action: filter }),
      })

      const response = await fetch(`/api/admin/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "user_login":
      case "user_logout":
      case "user_register":
        return <UserIcon className="h-4 w-4" />
      case "email_sent":
      case "email_received":
        return <EnvelopeIcon className="h-4 w-4" />
      case "email_deleted":
        return <TrashIcon className="h-4 w-4" />
      case "email_starred":
        return <StarIcon className="h-4 w-4" />
      case "folder_created":
      case "folder_deleted":
        return <FolderIcon className="h-4 w-4" />
      case "settings_updated":
        return <CogIcon className="h-4 w-4" />
      case "security_alert":
        return <ShieldCheckIcon className="h-4 w-4" />
      default:
        return <ExclamationTriangleIcon className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "user_login":
      case "email_sent":
        return "text-green-600 bg-green-100"
      case "user_logout":
      case "email_received":
        return "text-blue-600 bg-blue-100"
      case "email_deleted":
      case "user_deleted":
        return "text-red-600 bg-red-100"
      case "security_alert":
        return "text-yellow-600 bg-yellow-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const formatActionText = (activity: ActivityItem) => {
    const { action, details, user_name } = activity

    switch (action) {
      case "user_login":
        return `${user_name} logged in`
      case "user_logout":
        return `${user_name} logged out`
      case "email_sent":
        return `${user_name} sent email: "${details?.subject || "No subject"}"`
      case "email_received":
        return `${user_name} received email from ${details?.from || "unknown"}`
      case "email_deleted":
        return `${user_name} deleted email: "${details?.subject || "No subject"}"`
      case "folder_created":
        return `${user_name} created folder: "${details?.folderName || "Unknown"}"`
      case "domain_verified":
        return `${user_name} verified domain: ${details?.domain || "unknown"}`
      case "settings_updated":
        return `${user_name} updated ${details?.section || "settings"}`
      case "security_alert":
        return `Security alert: ${details?.message || "Unknown alert"}`
      default:
        return `${user_name} performed ${action.replace(/_/g, " ")}`
    }
  }

  const filterOptions = [
    { value: "all", label: "All Activities" },
    { value: "user_login", label: "Logins" },
    { value: "email_sent", label: "Emails Sent" },
    { value: "email_received", label: "Emails Received" },
    { value: "security_alert", label: "Security Alerts" },
    { value: "settings_updated", label: "Settings Changes" },
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity._id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${getActionColor(activity.action)}`}>
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatActionText(activity)}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                    <span className="text-gray-300">•</span>
                    <p className="text-xs text-gray-500">IP: {activity.ip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={fetchActivities}
            className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            Refresh Activity
          </button>
        </div>
      </div>
    </div>
  )
}
