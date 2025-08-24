"use client"

import { useState, useEffect } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js"
import { Line, Bar, Doughnut } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

interface UsageData {
  emailsOverTime: {
    labels: string[]
    sent: number[]
    received: number[]
  }
  storageUsage: {
    labels: string[]
    data: number[]
  }
  userActivity: {
    labels: string[]
    data: number[]
  }
  planDistribution: {
    labels: string[]
    data: number[]
    colors: string[]
  }
}

export default function UsageCharts() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")

  useEffect(() => {
    fetchUsageData()
  }, [timeRange])

  const fetchUsageData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setUsageData(data)
      }
    } catch (error) {
      console.error("Error fetching usage data:", error)
    } finally {
      setLoading(false)
    }
  }

  const emailChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Email Traffic Over Time",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  const storageChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Storage Usage (GB)",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  const planChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right" as const,
      },
      title: {
        display: true,
        text: "Plan Distribution",
      },
    },
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!usageData) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No usage data available</p>
      </div>
    )
  }

  const emailChartData = {
    labels: usageData.emailsOverTime?.labels,
    datasets: [
      {
        label: "Emails Sent",
        data: usageData.emailsOverTime?.sent,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
      {
        label: "Emails Received",
        data: usageData.emailsOverTime?.received,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
      },
    ],
  }

  const storageChartData = {
    labels: usageData.storageUsage?.labels,
    datasets: [
      {
        label: "Storage Used (GB)",
        data: usageData.storageUsage?.data,
        backgroundColor: "rgba(139, 92, 246, 0.8)",
        borderColor: "rgb(139, 92, 246)",
        borderWidth: 1,
      },
    ],
  }

  const userActivityData = {
    labels: usageData.userActivity?.labels,
    datasets: [
      {
        label: "Active Users",
        data: usageData.userActivity?.data,
        backgroundColor: "rgba(245, 158, 11, 0.8)",
        borderColor: "rgb(245, 158, 11)",
        borderWidth: 1,
      },
    ],
  }

  const planDistributionData = {
    labels: usageData.planDistribution?.labels,
    datasets: [
      {
        data: usageData.planDistribution?.data,
        backgroundColor: usageData.planDistribution?.colors,
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Traffic Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <Line data={emailChartData} options={emailChartOptions} />
        </div>

        {/* Storage Usage Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <Bar data={storageChartData} options={storageChartOptions} />
        </div>

        {/* User Activity Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <Bar
            data={userActivityData}
            options={{
              ...storageChartOptions,
              plugins: {
                ...storageChartOptions.plugins,
                title: {
                  display: true,
                  text: "Daily Active Users",
                },
              },
            }}
          />
        </div>

        {/* Plan Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <Doughnut data={planDistributionData} options={planChartOptions} />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">
            {usageData.emailsOverTime?.sent.reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Emails Sent</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {usageData.emailsOverTime?.received.reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Emails Received</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">
            {Math.max(...usageData.storageUsage?.data || []).toFixed(1)} GB
          </div>
          <div className="text-sm text-gray-600">Peak Storage Usage</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">{Math.max(...usageData.userActivity?.data || [])}</div>
          <div className="text-sm text-gray-600">Peak Daily Users</div>
        </div>
      </div>
    </div>
  )
}
