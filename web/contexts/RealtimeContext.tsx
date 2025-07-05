"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./AuthContext"
import io, { Socket } from "socket.io-client"

interface RealtimeContextType {
  newMessages: number
  markMessagesRead: () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [newMessages, setNewMessages] = useState(0)
  const {user} = useAuth()
  const token = localStorage.getItem("accessToken")

  useEffect(() => {
    if (!user) return

    // Setup Socket.IO client
    const socket: typeof Socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000", {
      path: "/ws",
      auth: { token }
    })

    // Listen to mailbox events
    socket.on("mailbox_event", (data) => {
      console.log("New mail received:", data)

      setNewMessages((prev) => prev + 1)

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`📩 New mail from ${data.message.from}`, {
          body: data.message.subject,
          icon: "/favicon.ico",
        })
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
  if (!context) throw new Error("useRealtime must be used within a RealtimeProvider")
  return context
}
