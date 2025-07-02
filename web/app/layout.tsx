import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/AuthContext"
import { RealtimeProvider } from "@/contexts/RealtimeContext"
import { initSentry } from "@/lib/sentry"
import { ToastProvider } from "@/components/ui/toast"

// Initialize Sentry
initSentry()

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DITMail - Enterprise Webmail",
  description: "Professional email management for your organization"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            <RealtimeProvider>{children}</RealtimeProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
