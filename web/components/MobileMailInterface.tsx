"use client"

import { useState, useEffect } from "react"
import { Bars3Icon, MagnifyingGlassIcon, BellIcon, PlusIcon } from "@heroicons/react/24/outline"
import MobileSidebar from "./mobile/MobileSidebar"
import MobileMessageList from "./mobile/MobileMessageList"
import MobileMessageView from "./mobile/MobileMessageView"
import MobileCompose from "./mobile/MobileCompose"
import SearchBar from "./mail/SearchBar"
import NotificationPanel from "./mail/NotificationPanel"
import { useRealtime } from "@/contexts/RealtimeContext"
import { signOut, useSession } from "next-auth/react"

export default function MobileMailInterface() {
  const {data: session} = useSession()
  const user = session?.user
  const { newMessages } = useRealtime()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFilters, setSearchFilters] = useState({})
  const [notifications, setNotifications] = useState([])
  const [replyMessage, setReplyMessage] = useState(null)

  useEffect(() => {
    fetchMessages()
  }, [selectedFolder])

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("accessToken")
      let url = `/api/messages?folder=${selectedFolder}&limit=50`

      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`
      }

      // Add filters
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value) {
          url += `&${key}=${encodeURIComponent(value)}`
        }
      })

      const response = await fetch(url, {
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
  }

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const handleMessageSelect = (message: any) => {
    setSelectedMessage(message)
  }

  const handleBackToList = () => {
    setSelectedMessage(null)
  }

  const handleCompose = () => {
    setComposeOpen(true)
    setReplyMessage(null)
  }

  const handleReply = (message: any) => {
    setReplyMessage(message)
    setComposeOpen(true)
  }

  const handleSearch = () => {
    fetchMessages()
    setSearchOpen(false)
  }

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchNotifications()
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchNotifications()
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const unreadNotifications = notifications.filter((n: any) => !n.read).length

  if (composeOpen) {
    return (
      <MobileCompose
        onClose={() => {
          setComposeOpen(false)
          setReplyMessage(null)
        }}
        onSent={() => {
          setComposeOpen(false)
          setReplyMessage(null)
          fetchMessages()
        }}
        replyMessage={replyMessage}
      />
    )
  }

  if (searchOpen) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <button onClick={() => setSearchOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
              ←
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Search</h1>
          </div>
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            onSearch={handleSearch}
          />
        </div>
      </div>
    )
  }

  if (selectedMessage) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <button onClick={handleBackToList} className="p-2 text-gray-400 hover:text-gray-600">
            ←
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate mx-4">
            {selectedMessage.subject || "(No subject)"}
          </h1>
          <div className="w-8" />
        </div>
        <MobileMessageView
          message={selectedMessage}
          onReply={handleReply}
          onForward={(message) => {
            // Handle forward
          }}
          onDelete={(messageId) => {
            // Handle delete
            handleBackToList()
            fetchMessages()
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 hover:text-gray-600">
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {selectedFolder === "inbox" ? "Inbox" : selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setSearchOpen(true)} className="p-2 text-gray-400 hover:text-gray-600">
              <MagnifyingGlassIcon className="h-6 w-6" />
            </button>
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 relative"
              >
                <BellIcon className="h-6 w-6" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setNotificationsOpen(false)}
                  onRefresh={fetchNotifications}
                  onMarkAsRead={handleMarkNotificationAsRead}
                  onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                  onDelete={handleDeleteNotification}
                />
              )}
            </div>
            <button onClick={handleCompose} className="p-2 bg-blue-600 text-white rounded-full">
              <PlusIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Message List */}
      <MobileMessageList
        messages={messages}
        loading={loading}
        onMessageSelect={handleMessageSelect}
        onRefresh={fetchMessages}
        folder={selectedFolder}
      />

      {/* Sidebar */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedFolder={selectedFolder}
        onFolderSelect={setSelectedFolder}
        onCompose={handleCompose}
        newMessages={newMessages}
        user={user}
        onLogout={signOut}
      />
    </div>
  )
}
