"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import AdminSidebar from "@/components/admin/AdminSidebar"
import DashboardStats from "@/components/admin/DashboardStats"
import SystemHealth from "@/components/admin/SystemHealth"
import RecentActivity from "@/components/admin/RecentActivity"
import UsageCharts from "@/components/admin/UsageCharts"

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user?.role !== "admin") {
      window.location.href = "/"
      return
    }

    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("accessToken")

      const [statsRes, healthRes, activityRes] = await Promise.all([
        fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/health", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/activity", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData)
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setActivity(activityData.activities)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Monitor and manage your DITMail system</p>
          </div>

          {/* Stats Overview */}
          {stats && <DashboardStats stats={stats} />}

          {/* System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {health && <SystemHealth health={health} />}
            <RecentActivity activities={activity} />
          </div>

          {/* Usage Charts */}
          <UsageCharts />
        </div>
      </div>
    </div>
  )
}
