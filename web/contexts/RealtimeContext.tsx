"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./AuthContext"

interface RealtimeContextType {
  newMessages: number
  markMessagesRead: () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [newMessages, setNewMessages] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // WebSocket connection for real-time updates
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws?userId=${user.id}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "new_mail") {
        setNewMessages((prev) => prev + 1)
        // Show notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`New email from ${data.from}`, {
            body: data.subject,
            icon: "/favicon.ico",
          })
        }
      }
    }

    return () => ws.close()
  }, [user])

  const markMessagesRead = () => {
    setNewMessages(0)
  }

  return <RealtimeContext.Provider value={{ newMessages, markMessagesRead }}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}
