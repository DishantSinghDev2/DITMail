// /home/dit/DITMail/web/app/mail/page.tsx
"use client"

import ResponsiveMailInterface from "@/components/ResponsiveMailInterface"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { redirect } from "next/navigation"
import { useEffect } from "react"
import { signIn, useSession } from "next-auth/react"

export default function MailPage() {
  const { data: session, status } = useSession()
  const user = session?.user

  if (status == "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  useEffect(() => {
    if (user && user.onboarding && !user.onboarding.completed) {
      redirect("/onboarding")
    }
  }, [user])

  // checking mailbox access
  useEffect(() => {
    if (user && !user.mailboxAccess && user.role !== "user" ){
      redirect("/admin")
    }
  }, [user])

  if (!user) {
    signIn('wyi', {
      callbackUrl: '/mail'
    })
  }

  return <ResponsiveMailInterface />
}
