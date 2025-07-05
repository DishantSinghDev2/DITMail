"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRealtime } from "@/contexts/RealtimeContext"
import MailSidebar from "./MailSidebar"
import MessageList from "./MessageList"
import MessageView from "./MessageView"
import ComposeModal from "./ComposeModal"
import SearchBar from "./SearchBar"
import NotificationPanel from "./NotificationPanel"
import { MagnifyingGlassIcon, Cog6ToothIcon, BellIcon, PlusIcon, ViewColumnsIcon } from "@heroicons/react/24/outline"
import { clientNotificationService } from "@/lib/notifications-client"

export default function MailInterface() {
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [threadMessages, setThreadMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [filters, setFilters] = useState({
    unread: false,
    starred: false,
    hasAttachments: false,
    priority: "",
    dateRange: "",
  })
  const [viewMode, setViewMode] = useState<"split" | "list">("split")
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "forward">("compose")
  const [replyMessage, setReplyMessage] = useState<any>(null)

  const { user, logout } = useAuth()
  const { newMessages, markMessagesRead } = useRealtime()

  // Fetch messages with advanced filtering
  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("accessToken")
      const params = new URLSearchParams({
        folder: selectedFolder,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.unread && { unread: "true" }),
        ...(filters.starred && { starred: "true" }),
        ...(filters.hasAttachments && { hasAttachments: "true" }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.dateRange && { dateRange: filters.dateRange }),
      })

      const response = await fetch(`/api/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedFolder, searchQuery, filters])

  // Fetch thread messages
  const fetchThreadMessages = useCallback(async (threadId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`/api/messages?threadId=${threadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setThreadMessages(data.messages)
      }
    } catch (error) {
      console.error("Error fetching thread messages:", error)
    }
  }, [])

  // Fetch notifications using client service
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await clientNotificationService.getUserNotifications()
      setNotifications(data.notifications)
      setUnreadNotifications(data.unreadCount)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (selectedThread) {
      fetchThreadMessages(selectedThread)
    }
  }, [selectedThread, fetchThreadMessages])

  // Real-time message updates
  useEffect(() => {
    if (newMessages > 0 && selectedFolder === "inbox") {
      fetchMessages()
      fetchNotifications()
    }
  }, [newMessages, selectedFolder, fetchMessages, fetchNotifications])

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder)
    setSelectedMessage(null)
    setSelectedThread(null)
    setThreadMessages([])
    if (folder === "inbox") {
      markMessagesRead()
    }
  }

  const handleMessageSelect = (message: any) => {
    setSelectedMessage(message)
    if (message.messageCount > 1) {
      setSelectedThread(message.thread_id)
    } else {
      setSelectedThread(null)
      setThreadMessages([])
    }

    // Mark as read
    if (!message.read) {
      markMessageAsRead(message._id)
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ read: true }),
      })
      fetchMessages()
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  }

  const handleStarMessage = async (messageId: string, starred: boolean) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ starred }),
      })
      fetchMessages()
    } catch (error) {
      console.error("Error starring message:", error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ folder: "trash" }),
      })
      fetchMessages()
      setSelectedMessage(null)
      setSelectedThread(null)
    } catch (error) {
      console.error("Error deleting message:", error)
    }
  }

  const handleReply = (message: any) => {
    setReplyMessage(message)
    setComposeMode("reply")
    setIsComposeOpen(true)
  }

  const handleOnBack = () => {
    setSelectedMessage(null)
    setSelectedThread(null)
  }

  const handleForward = (message: any) => {
    setReplyMessage(message)
    setComposeMode("forward")
    setIsComposeOpen(true)
  }

  const handleCompose = () => {
    setReplyMessage(null)
    setComposeMode("compose")
    setIsComposeOpen(true)
  }

  const handleComposeClose = () => {
    setIsComposeOpen(false)
    setReplyMessage(null)
    setComposeMode("compose")
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <MailSidebar
        selectedFolder={selectedFolder}
        onFolderSelect={handleFolderSelect}
        onCompose={handleCompose}
        newMessages={newMessages}
        user={user}
        onLogout={logout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-900 capitalize">{selectedFolder}</h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`p-2 rounded-md ${showSearch ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode(viewMode === "split" ? "list" : "split")}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                >
                  <ViewColumnsIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md relative"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationPanel
                    notifications={notifications}
                    onClose={() => setShowNotifications(false)}
                    onRefresh={fetchNotifications}
                  />
                )}
              </div>
              <button
                onClick={() => (window.location.href = "/settings")}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleCompose}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Compose</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="mt-4">
              <SearchBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                filters={filters}
                onFiltersChange={setFilters}
                onSearch={fetchMessages}
              />
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="overflow-hidden border-r border-gray-200 w-full">
          {selectedMessage ? <MessageView
            message={selectedMessage}
            threadMessages={threadMessages}
            onReply={handleReply}
            onForward={handleForward}
            onDelete={handleDeleteMessage}
            onStar={handleStarMessage}
            onBack={handleOnBack}
          /> : <MessageList
            messages={messages}
            loading={loading}
            selectedMessage={selectedMessage}
            onMessageSelect={handleMessageSelect}
            onRefresh={fetchMessages}
            onStar={handleStarMessage}
            onDelete={handleDeleteMessage}
            folder={selectedFolder}
          />
          }
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <ComposeModal
          onClose={handleComposeClose}
          onSent={() => {
            fetchMessages()
            handleComposeClose()
          }}
          replyTo={composeMode === "reply" ? replyMessage : undefined}
          forwardMessage={composeMode === "forward" ? replyMessage : undefined}
        />
      )}
    </div>
  )
}
