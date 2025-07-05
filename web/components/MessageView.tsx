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
  PrinterIcon,
  FlagIcon,
  ArchiveBoxIcon,
  TagIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"
import Dropdown from "./ui/Dropdown"
import { Archive, ArrowLeft, ChevronLeft, ChevronRight, MailMinus, OctagonAlert } from "lucide-react"

interface MessageViewProps {
  message: any
  threadMessages: any[]
  onReply: (message: any) => void
  onForward: (message: any) => void
  onDelete: (messageId: string) => void
  onStar: (messageId: string, starred: boolean) => void
  onBack: () => void;
}

export default function MessageView({
  message,
  threadMessages,
  onReply,
  onForward,
  onDelete,
  onStar,
  onBack
}: MessageViewProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [showFullHeaders, setShowFullHeaders] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (threadMessages.length > 0) {
      // Expand the latest message by default
      const latestMessage = threadMessages[threadMessages.length - 1]
      setExpandedMessages(new Set([latestMessage._id]))
    } else if (message) {
      setExpandedMessages(new Set([message._id]))
    }
  }, [message, threadMessages])

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

  const printMessage = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow && message) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Message</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
              .content { line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${message.subject}</h2>
              <p><strong>From:</strong> ${message.from}</p>
              <p><strong>To:</strong> ${message.to.join(", ")}</p>
              <p><strong>Date:</strong> ${new Date(message.created_at).toLocaleString()}</p>
            </div>
            <div class="content">
              ${message.html}
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const markAsSpam = async (messageId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ folder: "spam" }),
      })
    } catch (error) {
      console.error("Mark as spam error:", error)
    }
  }

  const addLabel = async (messageId: string, label: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}/labels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label }),
      })
    } catch (error) {
      console.error("Add label error:", error)
    }
  }

  const markAsUnRead = async (messageId: string) => {
    const token = localStorage.getItem("accessToken")
    fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ read: false }),
    }).then(() => onBack())
  }

  const onArchive = async (messageId: string) => {
    try {

      const token = localStorage.getItem("accessToken")
      fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ folder: "archive" }),
      }).then(() => onBack())
    } catch (error) {
      console.error("On Archive error: ", error)
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
      <div key={msg._id} className={`border rounded-lg ${isThread ? "mb-4" : ""}`}>
        {/* Message Header */}
        <div
          className={`p-4 cursor-pointer hover:bg-gray-50 ${isExpanded ? "border-b" : ""}`}
          onClick={() => isThread && toggleMessageExpansion(msg._id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {msg.from.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">{msg.from}</p>
                  {getPriorityBadge(msg.priority)}
                  {!msg.read && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                </div>
                <p className="text-xs text-gray-500">
                  To: {msg.to.join(", ")}
                  {msg.cc?.length > 0 && ` • CC: ${msg.cc.join(", ")}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
              {isThread && (
                <button className="p-1 hover:bg-gray-200 rounded">
                  <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          {!isExpanded && isThread && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 truncate">{msg.text}</p>
            </div>
          )}
        </div>

        {/* Message Content */}
        {isExpanded && (
          <div className="p-4">
            {/* Full Headers Toggle */}
            <div className="mb-4">
              <button
                onClick={() => setShowFullHeaders(!showFullHeaders)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showFullHeaders ? "Hide" : "Show"} full headers
              </button>
            </div>

            {/* Full Headers */}
            {showFullHeaders && (
              <div className="mb-4 p-3 bg-gray-50 rounded text-xs font-mono">
                <div>
                  <strong>Message-ID:</strong> {msg.message_id}
                </div>
                <div>
                  <strong>Date:</strong> {new Date(msg.created_at).toISOString()}
                </div>
                <div>
                  <strong>From:</strong> {msg.from}
                </div>
                <div>
                  <strong>To:</strong> {msg.to.join(", ")}
                </div>
                {msg.cc?.length > 0 && (
                  <div>
                    <strong>CC:</strong> {msg.cc.join(", ")}
                  </div>
                )}
                {msg.bcc?.length > 0 && (
                  <div>
                    <strong>BCC:</strong> {msg.bcc.join(", ")}
                  </div>
                )}
                <div>
                  <strong>Subject:</strong> {msg.subject}
                </div>
                {msg.in_reply_to && (
                  <div>
                    <strong>In-Reply-To:</strong> {msg.in_reply_to}
                  </div>
                )}
                {msg.references?.length > 0 && (
                  <div>
                    <strong>References:</strong> {msg.references.join(" ")}
                  </div>
                )}
              </div>
            )}

            {/* Message Body */}
            <div className="prose max-w-none mb-4">
              <div dangerouslySetInnerHTML={{ __html: msg.html }} />
            </div>

            {/* Attachments */}
            {msg.attachments?.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Attachments ({msg.attachments.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {msg.attachments.map((attachment: any) => (
                    <div
                      key={attachment._id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => downloadAttachment(attachment._id, attachment.filename)}
                    >
                      <PaperClipIcon className="h-5 w-5 text-gray-400" />
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

  if (!message && threadMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">📧</div>
          <p>No message is selected to read</p>
        </div>
      </div>
    )
  }

  const displayMessages = threadMessages.length > 0 ? threadMessages : [message]
  const latestMessage = displayMessages[displayMessages.length - 1]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>

            <button
              onClick={() => onArchive(latestMessage._id)}
              className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-red-50"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={() => markAsSpam(latestMessage._id)}
              className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-red-50"
            >
              <OctagonAlert className="h-4 w-4" />
            </button>
            <div className="bg-gray-700 w-1 h-4 "></div>
            <button
              onClick={() => markAsUnRead(latestMessage._id)}
              className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-red-50"
            >
              <MailMinus className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(latestMessage._id)}
              className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 text-red-600 rounded-md hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onStar(latestMessage._id, !latestMessage.starred)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              {latestMessage.starred ? (
                <StarIconSolid className="h-5 w-5 text-yellow-500" />
              ) : (
                <StarIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <Dropdown
              trigger={
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                </button>
              }
              items={[
                {
                  label: "Reply",
                  onClick: () => onReply(latestMessage),
                  icon: ArrowUturnLeftIcon,
                },
                {
                  label: "Forward",
                  onClick: () => onForward(latestMessage),
                  icon: ArrowUturnRightIcon,
                },
                {
                  label: "Print",
                  onClick: printMessage,
                  icon: PrinterIcon,
                },
              ]}
            />
          </div>

          <div className="flex items-center space-x-2">
            <p>1/1033</p>
            <div className="flex flex-row gap-2">
              <ChevronLeft className="w-3 h-3" />
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>


        <div>
          <h2 className="text-lg font-semibold text-gray-900 truncate">{latestMessage.subject}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayMessages.length > 1 && (
          <div className="mb-4 text-sm text-gray-600">{displayMessages.length} messages in this conversation</div>
        )}
        {displayMessages.map((msg) => renderMessage(msg, displayMessages.length > 1))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => onReply(latestMessage)}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowUturnLeftIcon className="h-4 w-4" />
          <span>Reply</span>
        </button>
        <button
          onClick={() => onForward(latestMessage)}
          className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <ArrowUturnRightIcon className="h-4 w-4" />
          <span>Forward</span>
        </button>
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
