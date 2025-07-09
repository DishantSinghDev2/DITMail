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
import SpamBanner from "./messages/SpamBanner"
import EmailViewer from "./messages/EmailViewer"
import InlineCompose from "./InlineCompose" // <-- IMPORT NEW COMPONENT
import "./email-editor/EmailEditor.css" // <-- IMPORT EDITOR CSS

interface MessageViewProps {
  message: any
  threadMessages: any[]
  onReply: (message: any) => void
  onForward: (message: any) => void
  onDelete: (messageId: string) => void
  onStar: (messageId: string, starred: boolean) => void
  onBack: () => void;
  totalMessages: number;
  currentMessage: number;
  onNext: () => void;
  onPrevious: () => void;
}

export default function MessageView({
  message,
  threadMessages,
  onReply, // This will be handled internally now, but kept for other uses if any
  onForward, // This will be handled internally now, but kept for other uses if any
  onDelete,
  onStar,
  onBack,
  totalMessages,
  currentMessage,
  onNext,
  onPrevious
}: MessageViewProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [showFullHeaders, setShowFullHeaders] = useState(false)
  const [loading, setLoading] = useState(false)
  const [composeMode, setComposeMode] = useState<'reply' | 'forward' | null>(null) // <-- STATE FOR INLINE EDITOR
  const [composeKey, setComposeKey] = useState(Date.now()) // <-- KEY TO RESET EDITOR

  useEffect(() => {
    if (threadMessages.length > 0) {
      const latestMessage = threadMessages[threadMessages.length - 1]
      setExpandedMessages(new Set([latestMessage._id]))
    } else if (message) {
      setExpandedMessages(new Set([message._id]))
    }
  }, [message, threadMessages])
  
  // Reset compose mode if the message changes
  useEffect(() => {
    setComposeMode(null)
  }, [message?._id, threadMessages[0]?._id])

  const toggleMessageExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  // --- All other functions (downloadAttachment, printMessage, etc.) remain unchanged ---
  // ... (keep all your existing functions here)
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
      }).then(() => onBack())

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
      }).then(() => onBack())
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

  const handleUnMarkSpam = async (messageId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ folder: "inbox" }),
      }).then(() => onBack())

    } catch (error) {
      console.error("Mark as non spam error:", error)
    }
  }

  const handleDeleteForever = async (messageId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      }).then(() => onBack())

    } catch (error) {
      console.error("Delete forever error:", error)
    }
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
  
  // --- END of unchanged functions ---

  const handleReplyClick = () => {
    setComposeKey(Date.now()); // Reset editor state by changing key
    setComposeMode('reply');
  };

  const handleForwardClick = () => {
    setComposeKey(Date.now()); // Reset editor state
    setComposeMode('forward');
  };

  const handleSendSuccess = () => {
    setComposeMode(null);
    onBack(); // Go back to the list view after sending
  };


  const renderMessage = (msg: any, isThread = false) => {
    // ... Your existing renderMessage function remains completely unchanged ...
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

            {/* Show a banner when its a spam email */}
            {msg.folder === "spam" && <SpamBanner onMarkNotSpam={() => handleUnMarkSpam(msg._id)} />}

            {/* Message Body */}
            <div className="mb-4">
              <EmailViewer html={msg.html} isSpam={msg.folder === "spam"} />
            </div>

            {/* Attachments */}
            {msg.attachments?.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Attachments ({msg.attachments.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {msg.attachments.map((attachment: any) => {
                    const isSpam = msg.folder === 'spam';
                    return (
                      <div
                        key={attachment._id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition
              ${isSpam
                            ? 'bg-red-50 dark:bg-red-900 border border-red-300 text-red-700 dark:text-red-200 cursor-not-allowed'
                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        onClick={() => {
                          if (!isSpam) downloadAttachment(attachment._id, attachment.filename);
                        }}
                      >
                        <PaperClipIcon className={`h-5 w-5 ${isSpam ? 'text-red-400' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSpam ? 'text-red-800 dark:text-red-100' : 'text-gray-900 dark:text-white'}`}>
                            {attachment.filename}
                          </p>
                          <p className={`text-xs ${isSpam ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {attachment.mimeType} • {Math.round(attachment.size / 1024)} KB
                          </p>
                          {isSpam && (
                            <p className="text-xs text-red-500 mt-1">
                              ⚠ Attachment blocked for your safety — mark as not spam to download.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
        {/* ... (Your header and its buttons remain unchanged) ... */}
         <div className="flex items-center justify-between mb-2">
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button onClick={onBack} title="Go back" className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>

            {latestMessage.folder === "inbox" ? (
              <>
                <button
                  title="Archive"
                  onClick={() => onArchive(latestMessage._id)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Archive className="h-4 w-4 text-gray-400" />
                </button>
                <button
                  title="Mark as spam"
                  onClick={() => markAsSpam(latestMessage._id)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <OctagonAlert className="h-4 w-4 text-gray-400" />
                </button>
              </>) : latestMessage.folder === "spam" ? (
                <>
                  <button
                    title="Delete forever"
                    onClick={() => handleDeleteForever(latestMessage._id)}
                    className="p-2 hover:bg-gray-100 rounded-md text-gray-400"
                  >
                    Delete forever
                  </button>
                  <div className="bg-gray-400 w-0.5 h-[14px] "></div>
                  <button
                    title="Mark as not spam"
                    onClick={() => handleUnMarkSpam(latestMessage._id)}
                    className="p-2 hover:bg-gray-100 rounded-md text-gray-400"
                  >
                    Not spam
                  </button>
                </>
              ): latestMessage.folder === "trash" ? (
                <>
                  <button
                    title="Delete forever"
                    onClick={() => handleDeleteForever(latestMessage._id)}
                    className="p-2 hover:bg-gray-100 rounded-md text-gray-400"
                  >
                    Delete forever
                  </button>
                </>
              ): (
                <>
                  <button
                  title="Mark as spam"
                  onClick={() => markAsSpam(latestMessage._id)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <OctagonAlert className="h-4 w-4 text-gray-400" />
                </button>
                </>
              )}
            <div className="bg-gray-400 w-0.5 h-[14px] "></div>
            <button
              title="Mark as unread"
              onClick={() => markAsUnRead(latestMessage._id)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <MailMinus className="h-4 w-4 text-gray-400" />
            </button>
            {latestMessage.folder === "inbox" && <button
              title="Delete"
              onClick={() => onDelete(latestMessage._id)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <TrashIcon className="h-4 w-4 text-red-400" />
            </button>}
            <button
              title="Star"
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
                <button title="More options" className="p-2 hover:bg-gray-100 rounded-full">
                  <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                </button>
              }
              items={[
                {
                  label: "Reply",
                  onClick: handleReplyClick, // <-- CHANGE
                  icon: ArrowUturnLeftIcon,
                },
                {
                  label: "Forward",
                  onClick: handleForwardClick, // <-- CHANGE
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

          <div className="flex items-center space-x-3">
            <div className="text-sm">
              {currentMessage} of {totalMessages}
            </div>
            <div className="flex flex-row gap-3">
              <button
                title="Back"
                onClick={() => onPrevious()}
                className="p-2 hover:bg-gray-100 rounded-full"
                disabled={currentMessage == 1}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                title="Next"
                onClick={() => onNext()}
                className="p-2 hover:bg-gray-100 rounded-full"
                disabled={currentMessage == totalMessages}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
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
        
        {/* HIDE original buttons if compose mode is active */}
        {!composeMode && (
          <div className="flex items-center gap-3 ml-5 mt-3 mb-10">
            <button
              onClick={handleReplyClick} // <-- CHANGE
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              <span>Reply</span>
            </button>
            <button
              onClick={handleForwardClick} // <-- CHANGE
              className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
              <span>Forward</span>
            </button>
          </div>
        )}
      </div>

      {/* RENDER inline compose component if active */}
      {composeMode && (
        <InlineCompose
          key={composeKey}
          mode={composeMode}
          messageToRespond={latestMessage}
          onCancel={() => setComposeMode(null)}
          onSend={handleSendSuccess}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}