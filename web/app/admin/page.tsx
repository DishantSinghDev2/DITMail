"use client"

import { useEffect, useState } from "react"
import AdminSidebar from "@/components/admin/AdminSidebar"
import DashboardStats from "@/components/admin/DashboardStats"
import AccessDeniedPage from "./accessDenied"

export default function AdminPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && ["owner", "admin"].includes(user.role)) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || !["owner", "admin"].includes(user.role)) {
    return <AccessDeniedPage />
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your organization and users</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DashboardStats stats={stats} />
        )}
      </div>
    </div>
  )
}
