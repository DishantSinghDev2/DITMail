"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { useAuth } from "./AuthContext"
import type { Socket } from "socket.io-client" // Import only the type

interface RealtimeContextType {
  newMessages: number
  markMessagesRead: () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [newMessages, setNewMessages] = useState(0)
  const { user } = useAuth()
  const socketRef = useRef< typeof Socket | null>(null)

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    if (socketRef.current) return

    const connectSocket = async () => {
      // Dynamically import and get the default export correctly
      const { default: io } = await import("socket.io-client")

      const token = localStorage.getItem("accessToken")

      const socket: typeof Socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000", {
        auth: { token },
        transports: ["websocket", "polling"]
      })

      socketRef.current = socket

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id)
      })
      
      socket.on("disconnect", () => {
        console.log("Socket disconnected.")
      })

      socket.on("mailbox_event", (data: any) => {
        console.log("New mail received:", data)
        setNewMessages((prev) => prev + 1)

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`📩 New mail from ${data.message.from}`, {
            body: data.message.subject,
            icon: "/favicon.ico",
          })
        }
      })
    }
    
    connectSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
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