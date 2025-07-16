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
import MiniComposer from "./mini-composer"
import MainComposer from "./main-composer"
import { set } from "lodash"
import { emailSchema } from "@/lib/schemas"
import z from "zod"
import { Attachment } from "./editor/email-editor"

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
  const [isMaximize, setIsMaximize] = useState(false)

  // New state variables for requested features
  const [showNotifications, setShowNotifications] = useState(false)
  const [initData, setInitData] = useState<z.infer<typeof emailSchema> | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [theme, setTheme] = useState('theme-default')
  const [totalMessages, setTotalMessages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50) // Default items per page
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 15 }) // Temporary storage info for demo

  const [composerData, setComposerData] = useState<z.infer<typeof emailSchema> | null>(null);
  const [composerAttachments, setComposerAttachments] = useState<Attachment[]>([]);

  const handleComposerDataChange = (
    data: z.infer<typeof emailSchema>,
    attachments: Attachment[]
  ) => {
    setComposerData(data);
    setComposerAttachments(attachments);
  };



  const [filters, setFilters] = useState({
    unread: false,
    starred: false,
    hasAttachments: false,
    priority: "",
    dateRange: "",
    sender: "",
    recipient: "",
    size: "",
    folder: "",
    label: "",
  })
  const sidebarRef = useRef<MailSidebarHandle>(null)

  const triggerRefresh = () => {
    sidebarRef.current?.refreshCount()
  }

  const { user, logout } = useAuth()
  const { newMessages, markMessagesRead } = useRealtime()

  // --- Core fetching logic remains the same ---

  const fetchMessages = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const token = localStorage.getItem("accessToken")
      const params = new URLSearchParams({
        folder: selectedFolder,
        page: String(page),
        limit: String(itemsPerPage),
        ...(searchQuery && { search: searchQuery }),
        ...(filters.unread && { unread: "true" }),
        ...(filters.starred && { starred: "true" }),
        ...(filters.hasAttachments && { hasAttachments: "true" }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.dateRange && { dateRange: filters.dateRange }),
        ...(filters.sender && { sender: filters.sender }),
        ...(filters.recipient && { recipient: filters.recipient }),
        ...(filters.size && { size: filters.size }),
        ...(filters.folder && { folder: filters.folder }),
        ...(filters.label && { label: filters.label }),
      })

      const response = await fetch(`/api/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
        setTotalMessages(data.pagination.total)
        setCurrentPage(data.pagination.page)
        setItemsPerPage(data.pagination.limit)
        sidebarRef.current?.refreshCount() // Refresh sidebar counts
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedFolder, searchQuery, itemsPerPage, filters])

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



  useEffect(() => {
    const root = window.document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    root.className = root.className.replace(/theme-\S+/g, '').trim()
    root.classList.add(theme)
  }, [isDarkMode, theme])

  useEffect(() => {
    fetchMessages(1) // Fetch first page when folder/search changes
  }, [selectedFolder, searchQuery, filters]) // Dependency array now correctly triggers refetch

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
      fetchMessages(currentPage)
    }
  }, [newMessages])

  // --- Handlers ---
  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder)
    setSelectedMessage(null)
    setSelectedThread(null)
    setThreadMessages([])
    setCurrentPage(1) // Reset to first page
    if (folder === "inbox") {
      markMessagesRead()
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && (newPage - 1) * itemsPerPage < totalMessages) {
      setCurrentPage(newPage)
      fetchMessages(newPage)
    }
  }


  const handleMessageSelect = (message: any) => {
    if (message.type){
      setSelectedMessage(null)
      setSelectedThread(null)
      setThreadMessages([])
      setComposerData({
        ...message,
        content: message.html || "",
      })
      setComposerAttachments(message.attachments || [])
      setIsComposeOpen(true)
      return
    }
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

  const handleCompose = () => {
    setIsComposeOpen(true);
  }
  const handleComposeClose = () => {
    setIsComposeOpen(false);
  }

  function handleOnBack(): void {
    setSelectedMessage(null)
    setSelectedThread(null)
    setThreadMessages([])
    fetchMessages()
  }


  // --- BULK ACTION HANDLERS ---
  const handleBulkUpdate = async (action: string, ids: string[]) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, messageIds: ids }),
      })
      fetchMessages() // Refresh the list after action
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error)
    }
  }

  const handleBulkDelete = (messageIds: string[]) => handleBulkUpdate("delete", messageIds)
  const handleBulkArchive = (messageIds: string[]) => handleBulkUpdate("archive", messageIds)
  const handleBulkMarkAsSpam = (messageIds: string[]) => handleBulkUpdate("spam", messageIds)
  const handleBulkMarkAsUnread = (messageIds: string[]) => handleBulkUpdate("unread", messageIds)
  const handleBulkRead = (messageIds: string[]) => {
    handleBulkUpdate("read", messageIds)
  }
  const handleBulkStar = (messageIds: string[]) => handleBulkUpdate("star", messageIds)
  const handleBulkUnstar = (messageIds: string[]) => handleBulkUpdate("unstar", messageIds)

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
        <header className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex-shrink-0 z-50">
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
            onRefresh={triggerRefresh}
            onStar={handleStarMessage}
            folder={selectedFolder}
            searchQuery={searchQuery}
            // --- Pass new props here ---
            totalMessages={totalMessages}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            storageUsedGB={storageInfo.used}
            storageTotalGB={storageInfo.total}
            // --- Pass bulk action handlers ---
            onDelete={handleBulkDelete}
            onArchive={handleBulkArchive}
            markAsSpam={handleBulkMarkAsSpam}
            markAsUnread={handleBulkMarkAsUnread}
            markAsRead={handleBulkRead}
            markAsStarred={handleBulkStar}
            markAsUnstarred={handleBulkUnstar}
          />
          }
        </div>
      </div>

      {/* Modals */}
      {isComposeOpen && (
        <MiniComposer
          isOpen={isComposeOpen}
          onClose={() => {
            setComposerData(null)
            setComposerAttachments([])
            handleComposeClose()}}
          onMaximize={() => {
            setIsComposeOpen(false)
            setIsMaximize(true)
          }}
          initialData={composerData}
          initialAttachments={composerAttachments}
          onDataChange={handleComposerDataChange}
        />
      )}
      {isUpgradeModalOpen && (
        <UpgradeModal onClose={() => setIsUpgradeModalOpen(false)} />
      )}


      {isMaximize && (
        <MainComposer
          isOpen={isMaximize}
          onClose={() => {
            setComposerData(null)
            setComposerAttachments([])
            setIsMaximize(false)}}
          onMinimize={() => {
            setIsComposeOpen(true)
            setIsMaximize(false)
          }}
          initialData={composerData}
          initialAttachments={composerAttachments}
          onDataChange={handleComposerDataChange}
        />
      )}
    </div>
  )
}