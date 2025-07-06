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
  
  useEffect(() => {
    if (!user) return
    
    const token = localStorage.getItem("accessToken")
    // Setup Socket.IO client
    const socket: typeof Socket = io("http://localhost:4000", {
      auth: { token }
    })

    // Listen to mailbox events
    socket.on("mailbox_event", (data) => {
      console.log("New mail received:", data)

      setNewMessages((prev) => prev + 1)
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
