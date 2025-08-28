import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { initSentry } from "@/lib/sentry"
import { Providers } from "./providers" // Import the new provider component
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route" // Adjust this path to your auth 
import { Toaster } from "@/components/ui/toaster";

// Initialize Sentry
initSentry()

const inter = Inter({ subsets: ["latin"] })

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const baseUrl = "https://mail.dishis.tech" // <-- replace with your real domain

  // Construct canonical from path params (works in app router)
  const canonical = `${baseUrl}${params?.slug ? `/${params.slug}` : ""}`
  return {
    title: "DITMail - Enterprise Webmail",
    description: "Professional email management for your organization",
    alternates: {
      canonical,
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log(process.env.NEXTAUTH_SECRET)
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers session={session}>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}