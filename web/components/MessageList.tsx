"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "@heroicons/react/24/outline"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"
import Dropdown from "./ui/Dropdown"

interface MessageListProps {
  messages: any[]
  loading: boolean
  selectedMessage: any
  onMessageSelect: (message: any) => void
  onRefresh: () => void
  onStar: (messageId: string, starred: boolean) => void
  onDelete: (messageId: string) => void
  folder: string
  searchQuery?: string
  onLoadMore?: () => void
  hasMore?: boolean
}

export default function MessageList({
  messages,
  loading,
  selectedMessage,
  onMessageSelect,
  onRefresh,
  onStar,
  onDelete,
  folder,
  searchQuery,
  onLoadMore,
  hasMore,
}: MessageListProps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [filterBy, setFilterBy] = useState("all")
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    setSelectedMessages(new Set())
    setSelectAll(false)
    setShowBulkActions(false)
  }, [messages, folder])

  const handleSelectMessage = (messageId: string, checked: boolean) => {
    const newSelected = new Set(selectedMessages)
    if (checked) {
      newSelected.add(messageId)
    } else {
      newSelected.delete(messageId)
    }
    setSelectedMessages(newSelected)
    setShowBulkActions(newSelected.size > 0)
    setSelectAll(newSelected.size === messages.length && messages.length > 0)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(messages.map((msg) => msg._id))
      setSelectedMessages(allIds)
    } else {
      setSelectedMessages(new Set())
    }
    setSelectAll(checked)
    setShowBulkActions(checked && messages.length > 0)
  }

  const handleBulkAction = async (action: string) => {
    const token = localStorage.getItem("accessToken")
    const messageIds = Array.from(selectedMessages)
    setActionLoading(action)

    try {
      const promises = messageIds.map((id) => {
        let body: any = {}

        switch (action) {
          case "star":
            body = { starred: true }
            break
          case "unstar":
            body = { starred: false }
            break
          case "read":
            body = { read: true }
            break
          case "unread":
            body = { read: false }
            break
          case "delete":
            body = { folder: "trash" }
            break
          case "archive":
            body = { folder: "archive" }
            break
          case "spam":
            body = { folder: "spam" }
            break
          case "inbox":
            body = { folder: "inbox" }
            break
        }

        return fetch(`/api/messages/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })
      })

      await Promise.all(promises)

      setSelectedMessages(new Set())
      setSelectAll(false)
      setShowBulkActions(false)
      onRefresh()
    } catch (error) {
      console.error("Bulk action error:", error)
      alert("Failed to perform bulk action. Please try again.")
    } finally {
      setActionLoading(null)
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckIcon className="h-4 w-4 text-green-500" title="Sent" />
      case "failed":
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" title="Failed to send" />
      case "sending":
        return (
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
            title="Sending"
          />
        )
      default:
        return null
    }
  }

  const getFilteredAndSortedMessages = useCallback(() => {
    let filtered = [...messages]

    // Apply filters
    switch (filterBy) {
      case "unread":
        filtered = filtered.filter((msg) => !msg.read)
        break
      case "starred":
        filtered = filtered.filter((msg) => msg.starred)
        break
      case "attachments":
        filtered = filtered.filter((msg) => msg.attachments?.length > 0)
        break
      case "high-priority":
        filtered = filtered.filter((msg) => msg.priority === "high")
        break
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "sender":
          comparison = a.from.localeCompare(b.from)
          break
        case "subject":
          comparison = a.subject.localeCompare(b.subject)
          break
        case "size":
          comparison = (a.size || 0) - (b.size || 0)
          break
      }

      return sortOrder === "desc" ? -comparison : comparison
    })

    return filtered
  }, [messages, filterBy, sortBy, sortOrder])

  const filteredMessages = getFilteredAndSortedMessages()

  const bulkActions = [
    { id: "read", label: "Mark as read", icon: CheckIcon },
    { id: "unread", label: "Mark as unread", icon: CheckIcon },
    { id: "star", label: "Add star", icon: StarIcon },
    { id: "unstar", label: "Remove star", icon: StarIcon },
    { id: "archive", label: "Archive", icon: ArchiveBoxIcon },
    { id: "spam", label: "Mark as spam", icon: ExclamationTriangleIcon },
    { id: "delete", label: "Delete", icon: TrashIcon, danger: true },
  ]

  if (folder !== "trash") {
    bulkActions.push({ id: "inbox", label: "Move to inbox", icon: ArchiveBoxIcon })
  }

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

  if (filteredMessages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="text-6xl mb-4">{searchQuery ? "🔍" : folder === "inbox" ? "📭" : "📂"}</div>
        <h3 className="text-lg font-medium mb-2">{searchQuery ? "No search results" : "No messages"}</h3>
        <p className="text-sm mb-4">
          {searchQuery ? `No messages found for "${searchQuery}"` : `Your ${folder} is empty`}
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with controls */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                {selectedMessages.size > 0 ? `${selectedMessages.size} selected` : "Select all"}
              </span>
            </label>

            {showBulkActions && (
              <div className="flex items-center space-x-2">
                {bulkActions.slice(0, 4).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleBulkAction(action.id)}
                    disabled={actionLoading === action.id}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      action.danger
                        ? "bg-red-100 hover:bg-red-200 text-red-700"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    } disabled:opacity-50`}
                  >
                    {actionLoading === action.id ? "..." : action.label}
                  </button>
                ))}

                <Dropdown
                  trigger={<button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">More</button>}
                  items={bulkActions.slice(4).map((action) => ({
                    label: action.label,
                    onClick: () => handleBulkAction(action.id),
                    icon: action.icon,
                    danger: action.danger,
                  }))}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter dropdown */}
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All messages</option>
              <option value="unread">Unread only</option>
              <option value="starred">Starred only</option>
              <option value="attachments">With attachments</option>
              <option value="high-priority">High priority</option>
            </select>

            {/* Sort dropdown */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split("-")
                setSortBy(sort)
                setSortOrder(order)
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="sender-asc">Sender A-Z</option>
              <option value="sender-desc">Sender Z-A</option>
              <option value="subject-asc">Subject A-Z</option>
              <option value="subject-desc">Subject Z-A</option>
            </select>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {filteredMessages.length} of {messages.length} messages
            {searchQuery && ` for "${searchQuery}"`}
          </span>
          {filterBy !== "all" && (
            <button onClick={() => setFilterBy("all")} className="text-blue-600 hover:text-blue-800">
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {filteredMessages.map((message) => (
            <div
              key={message._id}
              className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedMessage?._id === message._id ? "bg-blue-50 border-r-4 border-blue-500" : ""
              } ${!message.read ? "bg-blue-25" : ""}`}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0 mr-3">
                <input
                  type="checkbox"
                  checked={selectedMessages.has(message._id)}
                  onChange={(e) => handleSelectMessage(message._id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Star */}
              <div className="flex-shrink-0 mr-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStar(message._id, !message.starred)
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  {message.starred ? (
                    <StarIconSolid className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <StarIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0" onClick={() => onMessageSelect(message)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm truncate ${!message.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}
                    >
                      {folder === "sent" ? `To: ${message.to.join(", ")}` : message.from}
                    </span>
                    {getPriorityIcon(message.priority)}
                    {getStatusIcon(message.status)}
                    {!message.read && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                  </div>
                  <div className="flex items-center space-x-2">
                    {message.attachments?.length > 0 && (
                      <PaperClipIcon
                        className="h-4 w-4 text-gray-400"
                        title={`${message.attachments.length} attachments`}
                      />
                    )}
                    {message.labels?.length > 0 && (
                      <div className="flex space-x-1">
                        {message.labels.slice(0, 3).map((label: string, index: number) => (
                          <div key={index} className="w-2 h-2 rounded-full bg-blue-500" title={label} />
                        ))}
                        {message.labels.length > 3 && (
                          <span className="text-xs text-gray-400">+{message.labels.length - 3}</span>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div
                  className={`text-sm mb-1 truncate ${!message.read ? "font-medium text-gray-900" : "text-gray-700"}`}
                >
                  {message.subject || "(No subject)"}
                </div>
                <div className="text-xs text-gray-500 truncate">{message.text || "No preview available"}</div>
                {message.messageCount > 1 && (
                  <div className="text-xs text-blue-600 mt-1">{message.messageCount} messages in conversation</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 ml-3">
                <Dropdown
                  trigger={
                    <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                      <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  }
                  items={[
                    {
                      label: message.read ? "Mark as unread" : "Mark as read",
                      onClick: () => {
                        const token = localStorage.getItem("accessToken")
                        fetch(`/api/messages/${message._id}`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ read: !message.read }),
                        }).then(() => onRefresh())
                      },
                      icon: CheckIcon,
                    },
                    {
                      label: message.starred ? "Remove star" : "Add star",
                      onClick: () => onStar(message._id, !message.starred),
                      icon: StarIcon,
                    },
                    {
                      label: "Archive",
                      onClick: () => {
                        const token = localStorage.getItem("accessToken")
                        fetch(`/api/messages/${message._id}`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ folder: "archive" }),
                        }).then(() => onRefresh())
                      },
                      icon: ArchiveBoxIcon,
                    },
                    {
                      label: "Delete",
                      onClick: () => onDelete(message._id),
                      icon: TrashIcon,
                      danger: true,
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Load more button */}
        {hasMore && onLoadMore && (
          <div className="p-4 text-center border-t border-gray-200">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more messages"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
