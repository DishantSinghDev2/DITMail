"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { useAuth } from "./AuthContext"
// CRITICAL: This is the ONLY import from 'socket.io-client' at the top of the file.
// It MUST be a `type` import.
import type { Socket } from "socket.io-client"

interface RealtimeContextType {
  newMessages: number
  markMessagesRead: () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [newMessages, setNewMessages] = useState(0)
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // 1. Exit if no user is authenticated.
    if (!user) {
      // Clean up existing socket if the user logs out.
      if (socketRef.current) {
        console.log("User logged out, disconnecting socket.")
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    // 2. Exit if the socket is already connected.
    if (socketRef.current) {
      return
    }

    // 3. Define an async function to handle the connection.
    const connectSocket = async () => {
      // Dynamically import the library here. This prevents it from being in the server bundle.
      // We get the 'default' export and assign it to the 'io' variable.
      const { default: io } = await import("socket.io-client")

      console.log("Attempting to connect socket...")
      const token = localStorage.getItem("accessToken")

      // The actual URL should come from your environment variables
      const socketUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

      const socket: Socket = io(socketUrl, {
        auth: { token },
        transports: ["websocket", "polling"] // Be explicit about transports
      })

      // Store the connected socket in the ref
      socketRef.current = socket

      // ... register event listeners
      socket.on("connect", () => {
        console.log("Socket connected successfully:", socket.id)
      })

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason)
        // Important: Nullify the ref on disconnect to allow reconnection attempts
        socketRef.current = null;
      })

      socket.on("mailbox_event", (data) => {
        console.log("New mail received:", data)
        setNewMessages((prev) => prev + 1)
        // ... notification logic
      })
    }
    
    // 4. Call the connection function.
    connectSocket()

    // 5. The cleanup function ensures we disconnect on component unmount.
    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection.")
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [user]) // The effect re-runs ONLY when the user object changes.

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