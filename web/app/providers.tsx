"use client"

import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"
import { RealtimeProvider } from "@/contexts/RealtimeContext"
import { ToastProvider } from "@/components/ui/toast"

interface Props {
  children: ReactNode
  session: Session | null
}

export function Providers({ children, session }: Props) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <RealtimeProvider>{children}</RealtimeProvider>
      </ToastProvider>
    </SessionProvider>
  )
}