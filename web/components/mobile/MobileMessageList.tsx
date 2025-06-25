"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { PaperClipIcon, ChevronRightIcon, ArrowPathIcon } from "@heroicons/react/24/outline"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"

interface MobileMessageListProps {
  messages: any[]
  loading: boolean
  onMessageSelect: (message: any) => void
  onRefresh: () => void
  folder: string
}

export default function MobileMessageList({
  messages,
  loading,
  onMessageSelect,
  onRefresh,
  folder,
}: MobileMessageListProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 500)
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const getPriorityIndicator = (priority: string) => {
    if (priority === "high") {
      return <div className="w-1 h-full bg-red-500 absolute left-0 top-0" />
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-hidden">
      {/* Pull to refresh indicator */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Refreshing..." : "Pull to refresh"}</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-gray-500">
                {folder === "inbox" ? "No messages in inbox" : `No messages in ${folder}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message._id}
                onClick={() => onMessageSelect(message)}
                className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-4 active:bg-gray-50 transition-colors"
              >
                {getPriorityIndicator(message.priority)}

                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {message.from.charAt(0).toUpperCase()}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className={`text-sm font-medium truncate ${!message.read ? "text-gray-900" : "text-gray-600"}`}
                      >
                        {folder === "sent" ? `To: ${message.to.join(", ")}` : message.from}
                      </p>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                        {message.starred && <StarIconSolid className="h-4 w-4 text-yellow-500" />}
                        {message.attachments?.length > 0 && <PaperClipIcon className="h-4 w-4 text-gray-400" />}
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <p className={`text-sm mb-2 ${!message.read ? "font-medium text-gray-900" : "text-gray-600"}`}>
                      {truncateText(message.subject || "(No subject)", 50)}
                    </p>

                    <p className="text-xs text-gray-500 mb-2">{truncateText(message.text || "", 80)}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {!message.read && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                        {message.labels?.length > 0 && (
                          <div className="flex space-x-1">
                            {message.labels.slice(0, 2).map((label: string) => (
                              <span key={label} className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                            ))}
                            {message.labels.length > 2 && (
                              <span className="text-xs text-gray-400">+{message.labels.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thread indicator */}
                {message.messageCount > 1 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      {message.messageCount} messages • {message.unreadCount} unread
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
