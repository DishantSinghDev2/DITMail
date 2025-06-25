import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/AuthContext"
import { RealtimeProvider } from "@/contexts/RealtimeContext"
import { initSentry } from "@/lib/sentry"

// Initialize Sentry
initSentry()

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DITMail - Enterprise Webmail",
  description: "Professional email management for your organization",
    generator: 'v0.dev'
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
          <RealtimeProvider>{children}</RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
