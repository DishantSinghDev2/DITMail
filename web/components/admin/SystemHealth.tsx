"use client"

import { useState, useEffect } from "react"
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ServerIcon,
  CircleStackIcon,
  CloudIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline"

interface HealthMetric {
  name: string
  status: "healthy" | "warning" | "critical"
  value: string
  description: string
  lastCheck: string
}

interface SystemHealthProps {
  refreshInterval?: number
}

export default function SystemHealth({ refreshInterval = 30000 }: SystemHealthProps) {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    fetchHealthMetrics()
    const interval = setInterval(fetchHealthMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const fetchHealthMetrics = async () => {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch("/api/admin/health", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setHealthMetrics(data.metrics)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Error fetching health metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case "warning":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case "critical":
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <CircleStackIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-50 border-green-200"
      case "warning":
        return "bg-yellow-50 border-yellow-200"
      case "critical":
        return "bg-red-50 border-red-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getServiceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "database":
      case "mongodb":
        return <CircleStackIcon className="h-6 w-6 text-green-600" />
      case "redis":
      case "cache":
        return <ServerIcon className="h-6 w-6 text-red-600" />
      case "smtp":
      case "email":
        return <CloudIcon className="h-6 w-6 text-blue-600" />
      case "cpu":
      case "memory":
        return <CpuChipIcon className="h-6 w-6 text-purple-600" />
      default:
        return <ServerIcon className="h-6 w-6 text-gray-600" />
    }
  }

  const overallStatus =
    healthMetrics.length > 0
      ? healthMetrics.some((m) => m.status === "critical")
        ? "critical"
        : healthMetrics.some((m) => m.status === "warning")
          ? "warning"
          : "healthy"
      : "unknown"

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
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
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">System Health</h3>
            {getStatusIcon(overallStatus)}
          </div>
          {lastUpdate && <p className="text-sm text-gray-500">Last updated: {lastUpdate.toLocaleTimeString()}</p>}
        </div>
      </div>

      <div className="p-6">
        {healthMetrics.length === 0 ? (
          <div className="text-center py-8">
            <ServerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No health metrics available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {healthMetrics.map((metric, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getStatusColor(metric.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getServiceIcon(metric.name)}
                    <div>
                      <h4 className="font-medium text-gray-900">{metric.name}</h4>
                      <p className="text-sm text-gray-600">{metric.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{metric.value}</p>
                      <p className="text-xs text-gray-500">{new Date(metric.lastCheck).toLocaleTimeString()}</p>
                    </div>
                    {getStatusIcon(metric.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={fetchHealthMetrics}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh Health Check
          </button>
        </div>
      </div>
    </div>
  )
}
