"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  StarIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  PaperClipIcon,
  EllipsisVerticalIcon,
  FlagIcon,
  ArchiveBoxIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"

interface MobileMessageViewProps {
  message: any
  onReply: (message: any) => void
  onForward: (message: any) => void
  onDelete: (messageId: string) => void
}

export default function MobileMessageView({ message, onReply, onForward, onDelete }: MobileMessageViewProps) {
  const [threadMessages, setThreadMessages] = useState([])
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [showActions, setShowActions] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (message?.thread_id) {
      fetchThreadMessages()
    }
    // Expand the current message by default
    setExpandedMessages(new Set([message._id]))
  }, [message])

  const fetchThreadMessages = async () => {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`/api/messages?threadId=${message.thread_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setThreadMessages(data.messages)
      }
    } catch (error) {
      console.error("Error fetching thread messages:", error)
    }
  }

  const toggleMessageExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  const downloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      setLoading(true)
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Download error:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStar = async () => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${message._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ starred: !message.starred }),
      })

      // Update local state
      message.starred = !message.starred
    } catch (error) {
      console.error("Error toggling star:", error)
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            High Priority
          </span>
        )
      case "low":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Low Priority
          </span>
        )
      default:
        return null
    }
  }

  const renderMessage = (msg: any, isThread = false) => {
    const isExpanded = expandedMessages.has(msg._id)

    return (
      <div key={msg._id} className={`bg-white ${isThread ? "border-b border-gray-200" : ""}`}>
        {/* Message Header */}
        <div
          className="p-4 cursor-pointer active:bg-gray-50"
          onClick={() => isThread && toggleMessageExpansion(msg._id)}
        >
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {msg.from.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">{msg.from}</p>
                  {getPriorityBadge(msg.priority)}
                  {!msg.read && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                  {isThread &&
                    (isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-1">
                To: {msg.to.join(", ")}
                {msg.cc?.length > 0 && ` • CC: ${msg.cc.join(", ")}`}
              </p>
              {!isExpanded && isThread && <p className="text-sm text-gray-600 truncate">{msg.text}</p>}
            </div>
          </div>
        </div>

        {/* Message Content */}
        {isExpanded && (
          <div className="px-4 pb-4">
            {/* Message Body */}
            <div className="prose prose-sm max-w-none mb-4">
              <div dangerouslySetInnerHTML={{ __html: msg.html }} />
            </div>

            {/* Attachments */}
            {msg.attachments?.length > 0 && (
              <div className="border-t pt-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Attachments ({msg.attachments.length})</h4>
                <div className="space-y-2">
                  {msg.attachments.map((attachment: any) => (
                    <div
                      key={attachment._id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg active:bg-gray-100"
                      onClick={() => downloadAttachment(attachment._id, attachment.filename)}
                    >
                      <PaperClipIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                        <p className="text-xs text-gray-500">
                          {attachment.mimeType} • {Math.round(attachment.size / 1024)} KB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labels */}
            {msg.labels?.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2">
                  <TagIcon className="h-4 w-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {msg.labels.map((label: string) => (
                      <span
                        key={label}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const displayMessages = threadMessages.length > 0 ? threadMessages : [message]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 leading-tight">{message.subject}</h2>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onReply(message)}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium active:bg-blue-700"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              <span>Reply</span>
            </button>
            <button
              onClick={() => onForward(message)}
              className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm active:bg-gray-50"
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
              <span>Forward</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={toggleStar} className="p-2 rounded-full active:bg-gray-100">
              {message.starred ? (
                <StarIconSolid className="h-5 w-5 text-yellow-500" />
              ) : (
                <StarIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <button onClick={() => setShowActions(!showActions)} className="p-2 rounded-full active:bg-gray-100">
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Action Menu */}
        {showActions && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
            <button
              onClick={() => {
                // Mark as spam logic
                setShowActions(false)
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <FlagIcon className="h-4 w-4" />
              <span>Mark as spam</span>
            </button>
            <button
              onClick={() => {
                // Archive logic
                setShowActions(false)
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <ArchiveBoxIcon className="h-4 w-4" />
              <span>Archive</span>
            </button>
            <button
              onClick={() => {
                onDelete(message._id)
                setShowActions(false)
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {displayMessages.length > 1 && (
          <div className="p-4 bg-white border-b border-gray-200">
            <p className="text-sm text-gray-600">{displayMessages.length} messages in this conversation</p>
          </div>
        )}
        {displayMessages.map((msg) => renderMessage(msg, displayMessages.length > 1))}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}
