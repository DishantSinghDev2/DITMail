// components/MailInterface.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRealtime } from "@/contexts/RealtimeContext"
import MailSidebar, { MailSidebarHandle } from "./MailSidebar"
import MessageList from "./MessageList"
import MessageView from "./MessageView"
import ComposeModal from "./ComposeModal"
import SearchBar from "./SearchBar"
import NotificationPanel from "./NotificationPanel"
import SettingsDropdown from "./mail/SettingsDropdown" // <-- Import new component
import UpgradeModal from "./mail/UpgradeModal" // <-- Import new component
import FilterPopover from "./mail/FilterPopover" // <-- Import new component
import { BellIcon, AdjustmentsHorizontalIcon, SparklesIcon, InformationCircleIcon } from "@heroicons/react/24/outline"
import { clientNotificationService } from "@/lib/notifications-client"
import { Settings } from "lucide-react"

export default function MailInterface() {
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [threadMessages, setThreadMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  // New state variables for requested features
  const [showNotifications, setShowNotifications] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [theme, setTheme] = useState('theme-default')

  const [filters, setFilters] = useState({
    unread: false,
    starred: false,
    hasAttachments: false,
  })
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "forward">("compose")
  const [replyMessage, setReplyMessage] = useState<any>(null)
  const sidebarRef = useRef<MailSidebarHandle>(null)
  
  const triggerRefresh = () => {
    sidebarRef.current?.refreshCount()
  }

  const { user, logout } = useAuth()
  const { newMessages, markMessagesRead } = useRealtime()

  // --- Core fetching logic remains the same ---
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
      })

      const response = await fetch(`/api/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
        triggerRefresh()
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedFolder, searchQuery, filters])
  
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

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await clientNotificationService.getUserNotifications()
      setNotifications(data.notifications)
      setUnreadNotifications(data.unreadCount)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }, [])


  // Add effect for Dark Mode and Theme
  useEffect(() => {
    const root = window.document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    // Remove old theme classes
    root.classList.forEach(className => {
        if(className.startsWith('theme-')) {
            root.classList.remove(className);
        }
    });
    // Add new theme class
    root.classList.add(theme)
  }, [isDarkMode, theme])

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

  useEffect(() => {
    if (newMessages > 0 && selectedFolder === "inbox") {
      fetchMessages()
      fetchNotifications()
    }
  }, [newMessages, selectedFolder, fetchMessages, fetchNotifications])

  // --- Handlers (handleFolderSelect, etc.) remain the same ---
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
    if (!message.read) markMessageAsRead(message._id)
  }

  const markMessageAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ read: true }),
      })
      fetchMessages()
    } catch (error) { console.error("Error marking message as read:", error) }
  }

  const handleStarMessage = async (messageId: string, starred: boolean) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ starred }),
      })
      fetchMessages() // Refresh list to show star
      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage({ ...selectedMessage, starred }); // Update view immediately
      }
    } catch (error) { console.error("Error starring message:", error) }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ folder: "trash" }),
      })
      fetchMessages()
      setSelectedMessage(null)
      setSelectedThread(null)
    } catch (error) { console.error("Error deleting message:", error) }
  }
  
  const handleReply = (message: any) => {
    setReplyMessage(message); setComposeMode("reply"); setIsComposeOpen(true);
  }
  const handleForward = (message: any) => {
    setReplyMessage(message); setComposeMode("forward"); setIsComposeOpen(true);
  }
  const handleCompose = () => {
    setReplyMessage(null); setComposeMode("compose"); setIsComposeOpen(true);
  }
  const handleComposeClose = () => {
    setIsComposeOpen(false); setReplyMessage(null); setComposeMode("compose");
  }

  function handleOnBack(): void {
    setSelectedMessage(null)
    setSelectedThread(null)
    setThreadMessages([])
    fetchMessages()
  }

  function handleOnPrevious(): void {
    const currentIndex = messages.findIndex((m: any) => m.id === selectedMessage.id);
    if (currentIndex > 0) {
      const previousMessage = messages[currentIndex - 1];
      handleMessageSelect(previousMessage);
    }
  }
  function handleOnNext(): void {
    const currentIndex = messages.findIndex((m: any) => m.id === selectedMessage.id);
    if (currentIndex < messages.length - 1) {
      const nextMessage = messages[currentIndex + 1];
      handleMessageSelect(nextMessage);
    }
  }
  return (
    <div className="h-screen w-screen flex bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
      <MailSidebar
        ref={sidebarRef}
        selectedFolder={selectedFolder}
        onFolderSelect={handleFolderSelect}
        onCompose={handleCompose}
        newMessages={newMessages}
        user={user}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Search Bar is now permanent */}
            <div className="flex-1 max-w-2xl">
              <SearchBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onSearch={fetchMessages}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>

            {/* Right-side Icons */}
            <div className="flex items-center space-x-2">
              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <SettingsDropdown
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                    currentTheme={theme}
                    onChangeTheme={setTheme}
                />
              </div>


              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Notifications"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                  )}
                </button>
                {showNotifications && (
                  <NotificationPanel
                    notifications={notifications}
                    onClose={() => setShowNotifications(false)}
                    onRefresh={fetchNotifications}
                    onMarkAsRead={(notificationId) => {
                      // Add logic to mark a notification as read
                      console.log(`Marking notification ${notificationId} as read`);
                    }}
                    onMarkAllAsRead={() => {
                      // Add logic to mark all notifications as read
                      console.log("Marking all notifications as read");
                    }}
                    onDelete={(notificationId) => {
                      // Add logic to delete a notification
                      console.log(`Deleting notification ${notificationId}`);
                    }}
                  />
                )}
              </div>
              

              
              {/* Upgrade Button */}
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1.5 rounded-full text-sm font-semibold transition-transform hover:scale-105"
              >
                <SparklesIcon className="h-4 w-4" />
                <span>Upgrade</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="overflow-x-hidden overflow-y-auto min-h-[90vh] border-r border-gray-200 w-full">
          {selectedMessage ? <MessageView
            message={selectedMessage}
            threadMessages={threadMessages}
            onReply={handleReply}
            onForward={handleForward}
            onDelete={handleDeleteMessage}
            onStar={handleStarMessage}
            onBack={handleOnBack}
            totalMessages={messages.length}
            currentMessage={messages.findIndex((m: any) => m.id === selectedMessage.id) + 1}
            onPrevious={handleOnPrevious}
            onNext={handleOnNext}
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

      {/* Modals */}
      {isComposeOpen && (
        <ComposeModal
          onClose={handleComposeClose}
          onSent={() => { fetchMessages(); handleComposeClose(); }}
          replyTo={composeMode === "reply" ? replyMessage : undefined}
          forwardMessage={composeMode === "forward" ? replyMessage : undefined}
        />
      )}
      {isUpgradeModalOpen && (
        <UpgradeModal onClose={() => setIsUpgradeModalOpen(false)} />
      )}
    </div>
  )
}