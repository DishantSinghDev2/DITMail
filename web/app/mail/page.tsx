"use client"

import { useAuth } from "@/contexts/AuthContext"
import AuthForm from "@/components/AuthForm"
import ResponsiveMailInterface from "@/components/ResponsiveMailInterface"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { redirect } from "next/navigation"

export default function MailPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user && user.onboarding && !user.onboarding.completed) {
    redirect("/onboarding")
  }

  if (!user) {
    return <AuthForm />
  }

  return <ResponsiveMailInterface />
}
