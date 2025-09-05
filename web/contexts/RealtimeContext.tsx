"use client"

import { useSession } from "next-auth/react"
import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { useMailStore } from "@/lib/store/mail"; // <-- IMPORT THE STORE
import type { Socket } from "socket.io-client"
import { useToast } from "@/hooks/use-toast";

interface RealtimeContextType {
  newMessages: number
  markMessagesRead: () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [newMessages, setNewMessages] = useState(0)
  const { data: session } = useSession()
  const user = session?.user
  const socketRef = useRef<Socket | null>(null)
  const { addFailedMessage } = useMailStore();
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        console.log("User logged out, disconnecting socket.")
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    if (socketRef.current) {
      return
    }

    const connectSocket = async () => {
      const { default: io } = await import("socket.io-client")

      console.log("Attempting to connect socket...")
      const token = user.accessToken

      const isSecure = window.location.protocol === "https:";
      const wsProtocol = isSecure ? "wss://" : "ws://";
      const wsHost = 'ws.ditmail.online';
      const wsUrl = `${wsProtocol}${wsHost}`;

      console.log("Attempting to connect to WebSocket at:", wsUrl);

      const socket: Socket = io(wsUrl, {
        auth: { token },
        transports: ["websocket", "polling"]
      });


      socketRef.current = socket

      socket.on("connect", () => {
        console.log("Socket connected successfully:", socket.id)
      })

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason)
        socketRef.current = null;
      })

      socket.on("mailbox_event", (data) => {
        console.log("New mail received:", data)
        setNewMessages((prev) => prev + 1)
      })
      socket.on("delivery_failure_event", (data) => {
        console.log("Delivery failure received:", data);
        addFailedMessage(data.messageId, data.reason);
        toast({ title: "Message Delivery Failed", description: `Could not deliver to ${data.recipient}.`, variant: "destructive" });
      });

    }

    connectSocket()

    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection.")
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [user, addFailedMessage])

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