"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  PaperClipIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  TrashIcon,
  ArchiveBoxIcon,
  EllipsisVerticalIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  MinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"
import Dropdown from "./ui/Dropdown"
import { ChevronDown } from "lucide-react"

interface MessageListProps {
  messages: any[]
  loading: boolean
  selectedMessage: any
  onMessageSelect: (message: any) => void
  onRefresh: () => void
  onStar: (messageId: string, starred: boolean) => void
  onDelete: (messageIds: string[]) => void
  onArchive: (messageIds: string[]) => void
  markAsSpam: (messageIds: string[]) => void
  markAsUnread: (messageIds: string[]) => void
  folder: string
  searchQuery?: string
  // Pagination Props
  totalMessages: number
  currentPage: number
  itemsPerPage: number
  onPageChange: (newPage: number) => void
  // Storage Props
  storageUsedGB: number
  storageTotalGB: number
}

export default function MessageList({
  messages,
  loading,
  selectedMessage,
  onMessageSelect,
  onRefresh,
  onStar,
  onDelete,
  onArchive,
  markAsSpam,
  markAsUnread,
  folder,
  searchQuery,
  totalMessages,
  currentPage,
  itemsPerPage,
  onPageChange,
  storageUsedGB,
  storageTotalGB,
}: MessageListProps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [refreshing, setRefreshing] = useState(false)

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedMessages(new Set())
  }, [messages, folder, currentPage])

  useEffect(() => {
    const isAllSelected = selectedMessages.size === messages.length && messages.length > 0
    const isPartiallySelected = selectedMessages.size > 0 && selectedMessages.size < messages.length
    setSelectAll(isAllSelected)
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPartiallySelected
    }
  }, [selectedMessages, messages])

  const handleSelectMessage = (messageId: string, checked: boolean) => {
    const newSelected = new Set(selectedMessages)
    if (checked) {
      newSelected.add(messageId)
    } else {
      newSelected.delete(messageId)
    }
    setSelectedMessages(newSelected)
  }

  const handleSelectionChange = (type: "all" | "none" | "read" | "unread" | "starred" | "unstarred") => {
    let newSelectedIds = new Set<string>()
    if (type === "all") {
      newSelectedIds = new Set(messages.map((msg) => msg._id))
    } else if (type === "none") {
      newSelectedIds = new Set<string>()
    } else {
      messages.forEach((msg) => {
        const condition =
          (type === "read" && msg.read) ||
          (type === "unread" && !msg.read) ||
          (type === "starred" && msg.starred) ||
          (type === "unstarred" && !msg.starred)

        if (condition) {
          newSelectedIds.add(msg._id)
        }
      })
    }
    setSelectedMessages(newSelectedIds)
  }

  const handleBulkDelete = () => {
    onDelete(Array.from(selectedMessages))
    setSelectedMessages(new Set())
  }
  const handleBulkArchive = () => {
    onArchive(Array.from(selectedMessages))
    setSelectedMessages(new Set())
  }

  const handleBulkSpam = () => {
    markAsSpam(Array.from(selectedMessages))
    setSelectedMessages(new Set())
  }

  const handleBulkUnread = () => {
    markAsUnread(Array.from(selectedMessages))
    setSelectedMessages(new Set())
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 500)
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" title="High priority" />
      case "low":
        return <div className="h-4 w-4 rounded-full bg-blue-500 opacity-50" title="Low priority" />
      default:
        return null
    }
  }

  const sortedMessages = useCallback(() => {
    let sorted = [...messages]
    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "sender":
          comparison = (folder === "sent" ? a.to[0] : a.from).localeCompare(folder === "sent" ? b.to[0] : b.from)
          break
        case "subject":
          comparison = a.subject.localeCompare(b.subject)
          break
      }
      return sortOrder === "desc" ? -comparison : comparison
    })
    return sorted
  }, [messages, sortBy, sortOrder, folder])

  const currentMessages = sortedMessages()

  const paginationStart = Math.min((currentPage - 1) * itemsPerPage + 1, totalMessages)
  const paginationEnd = Math.min(currentPage * itemsPerPage, totalMessages)

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header with controls */}
      <div className="border-b border-gray-200 p-2 sm:p-4 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                ref={selectAllCheckboxRef}
                checked={selectAll}
                onChange={(e) => handleSelectionChange(e.target.checked ? "all" : "none")}
                className="rounded border-gray-300 p-1.5 text-blue-600 focus:ring-blue-500"
              />
              <Dropdown
                trigger={
                  <button className="px-1 text-sm text-gray-600 hover:bg-gray-200 rounded">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                }
                items={[
                  { label: "All", onClick: () => handleSelectionChange("all") },
                  { label: "None", onClick: () => handleSelectionChange("none") },
                  { label: "Read", onClick: () => handleSelectionChange("read") },
                  { label: "Unread", onClick: () => handleSelectionChange("unread") },
                  { label: "Starred", onClick: () => handleSelectionChange("starred") },
                  { label: "Unstarred", onClick: () => handleSelectionChange("unstarred") },
                ]}
              />
            </div>

            {selectedMessages.size > 0 ? (
              <div className="flex items-center space-x-1">
                <button title="Archive" onClick={handleBulkArchive} className="p-2 hover:bg-gray-100 rounded-full">
                  <ArchiveBoxIcon className="h-5 w-5 text-gray-500" />
                </button>
                <button title="Mark as spam" onClick={handleBulkSpam} className="p-2 hover:bg-gray-100 rounded-full">
                  <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
                </button>
                <button title="Delete" onClick={handleBulkDelete} className="p-2 hover:bg-gray-100 rounded-full">
                  <TrashIcon className="h-5 w-5 text-gray-500" />
                </button>
                <div className="bg-gray-200 w-0.5 h-5"></div>
                <button title="Mark as unread" onClick={handleBulkUnread} className="p-2 hover:bg-gray-100 rounded-full">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <ArrowPathIcon className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              {totalMessages > 0 ? `${paginationStart}-${paginationEnd} of ${totalMessages}` : "0 of 0"}
            </span>
            <div className="flex items-center">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={paginationEnd >= totalMessages}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors disabled:opacity-50"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
            <Dropdown
              trigger={
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full" title="Sort options">
                  <ArrowUpIcon
                    className={`h-5 w-5 inline-block transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`}
                  />
                </button>
              }
              items={[
                {
                  label: "Newest first",
                  onClick: () => {
                    setSortBy("date");
                    setSortOrder("desc");
                  },
                },
                {
                  label: "Oldest first",
                  onClick: () => {
                    setSortBy("date");
                    setSortOrder("asc");
                  },
                },
                {
                  label: "Sender A-Z",
                  onClick: () => {
                    setSortBy("sender");
                    setSortOrder("asc");
                  },
                },
                {
                  label: "Sender Z-A",
                  onClick: () => {
                    setSortBy("sender");
                    setSortOrder("desc");
                  },
                },
              ]}
            />
          </div>
        </div>
      </div>

      {currentMessages.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
          <div className="text-6xl mb-4">{searchQuery ? "🔍" : folder === "inbox" ? "📭" : "📂"}</div>
          <h3 className="text-lg font-medium mb-2">{searchQuery ? "No search results" : "No messages here"}</h3>
          <p className="text-sm mb-4">
            {searchQuery ? `Your search for "${searchQuery}" did not match any messages.` : `Your ${folder} folder is empty.`}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-200">
            {currentMessages.map((message) => (
              <div
                key={message._id}
                className={`flex items-start p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${
                  selectedMessage?._id === message._id ? "bg-blue-50" : ""
                } ${!message.read ? "bg-blue-25 font-semibold" : ""} ${
                  selectedMessages.has(message._id) ? "bg-blue-100" : ""
                }`}
                onClick={() => onMessageSelect(message)}
              >
                 {selectedMessage?._id === message._id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                )}
                {/* Checkbox & Star */}
                <div className="flex flex-col sm:flex-row items-center gap-2 mr-3">
                  <input
                    type="checkbox"
                    checked={selectedMessages.has(message._id)}
                    onChange={(e) => handleSelectMessage(message._id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onStar(message._id, !message.starred)
                    }}
                    className="p-1 rounded-full"
                  >
                    {message.starred ? (
                      <StarIconSolid className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <StarIcon className="h-5 w-5 text-gray-300 hover:text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="text-sm truncate pr-2">
                        <span className={!message.read ? "text-gray-900" : "text-gray-600"}>
                            {folder === "sent" ? `To: ${message.to.join(", ")}` : message.from}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                       {message.attachments?.length > 0 && <PaperClipIcon className="h-4 w-4 text-gray-400" />}
                      <span className={`text-xs whitespace-nowrap ${!message.read ? "text-gray-800 font-bold" : "text-gray-500"}`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className={`text-sm truncate pr-4 ${!message.read ? "text-gray-800" : "text-gray-700"}`}>
                    {message.subject || "(no subject)"}
                  </div>
                  <div className="text-xs text-gray-500 truncate pr-4">{message.text || "No preview available"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="border-t border-gray-200 p-2 bg-white text-xs text-gray-600 sticky bottom-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
               <div className="w-1/3">
                  <p>{storageUsedGB.toFixed(2)} GB of {storageTotalGB} GB used</p>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div className="bg-blue-600 h-1 rounded-full" style={{width: `${(storageUsedGB / storageTotalGB) * 100}%`}}></div>
                  </div>
               </div>
               <div className="flex space-x-4">
                  <a href="#" className="hover:text-blue-700">Terms</a>
                  <a href="#" className="hover:text-blue-700">Privacy</a>
               </div>
          </div>
      </div>
    </div>
  )
}