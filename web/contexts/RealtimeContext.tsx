"use client"

import React, { createContext, useContext, useState } from "react"
import dynamic from "next/dynamic"

// THIS IS THE KEY:
// We dynamically import the entire SocketHandler component and explicitly
// disable Server-Side Rendering (SSR) for it.
const SocketHandler = dynamic(
  () => import("@/components/SocketHandler"), // Adjust the import path as needed
  { ssr: false }
)

interface RealtimeContextType {
  newMessages: number
  markMessagesRead: () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [newMessages, setNewMessages] = useState(0)

  const markMessagesRead = () => {
    setNewMessages(0)
  }

  return (
    <RealtimeContext.Provider value={{ newMessages, markMessagesRead }}>
      {/* 
        This client-only component is now rendered here.
        It will handle the socket connection and update state using the prop.
        Because it's loaded with `ssr: false`, Next.js will not try to
        bundle its problematic dependencies on the server.
      */}
      <SocketHandler setNewMessages={setNewMessages} />
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) throw new Error("useRealtime must be used within a RealtimeProvider")
  return context
}