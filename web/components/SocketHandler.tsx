"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext" // Adjust the import path as needed
import type { Socket } from "socket.io-client"

interface SocketHandlerProps {
  setNewMessages: React.Dispatch<React.SetStateAction<number>>
}

// This component renders NO UI. It's a pure logic component for managing side effects.
export default function SocketHandler({ setNewMessages }: SocketHandlerProps) {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Exit if there is no authenticated user.
    if (!user) {
      // If a socket connection exists, disconnect it.
      if (socketRef.current?.connected) {
        console.log("User is not authenticated, disconnecting socket.")
        socketRef.current.disconnect()
      }
      socketRef.current = null
      return
    }

    // Avoid creating a new connection if one already exists.
    if (socketRef.current) {
      return
    }

    // Define an async function to perform the dynamic import and connection.
    const connectSocket = async () => {
      // We still use a dynamic import here as a best practice.
      const { default: io } = await import("socket.io-client")

      const token = localStorage.getItem("accessToken")
      const socketUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000"

      console.log("Initializing socket connection...")

      const socket: Socket = io(socketUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
      })

      socketRef.current = socket

      socket.on("connect", () => console.log("Socket connected:", socket.id))
      socket.on("disconnect", () => console.log("Socket disconnected."))

      // When a "mailbox_event" is received, update the state via the prop function.
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
    }

    connectSocket()

    // The cleanup function is critical for preventing memory leaks.
    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection.")
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
    // The effect depends on the user's status and the state setter function.
  }, [user, setNewMessages])

  // This component does not render any visual elements.
  return null
}