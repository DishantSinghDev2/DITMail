"use client"

import { useAuth } from "@/contexts/AuthContext"
import AuthForm from "@/components/AuthForm"
import ResponsiveMailInterface from "@/components/ResponsiveMailInterface"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return <ResponsiveMailInterface />
}
