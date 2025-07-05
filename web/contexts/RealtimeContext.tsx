"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./AuthContext"
import io from "socket.io-client"

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

    const token = localStorage.getItem("accessToken") // ✅ now safely inside useEffect

    const socket = io("http://localhost:4000", {
      auth: { token }
    })

    socket.on("mailbox_event", (data) => {
      if (data.type === "new_mail") {
        setNewMessages((prev) => prev + 1)

        // Optional: Show native browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`New email from ${data.message.from}`, {
            body: data.message.subject,
            icon: "/favicon.ico",
          })
        }
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [user])

  const markMessagesRead = () => {
    setNewMessages(0)
  }

  return (
    <RealtimeContext.Provider value={{ newMessages, markMessagesRead }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}
