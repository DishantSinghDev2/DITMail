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
  TagIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"
import Dropdown from "./ui/Dropdown"
import { Archive, ArrowLeft, ChevronLeft, ChevronRight, MailMinus, OctagonAlert, Settings2 } from "lucide-react"
import SpamBanner from "./messages/SpamBanner"
import EmailViewer from "./messages/EmailViewer"
import InlineReplyComposer from "@/components/inline-reply-composer"

interface MessageViewProps {
  message: any
  threadMessages: any[]
  onDelete: (messageId: string) => void
  onStar: (messageId: string, starred: boolean) => void
  onBack: () => void
  totalMessages: number
  currentMessage: number
  onNext: () => void
  onPrevious: () => void
}

export default function MessageView({
  message,
  threadMessages,
  onDelete,
  onStar,
  onBack,
  totalMessages,
  currentMessage,
  onNext,
  onPrevious,
}: MessageViewProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [showFullHeaders, setShowFullHeaders] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editorMode, setEditorMode] = useState<"closed" | "reply" | "forward">("closed")

  useEffect(() => {
    const messages = threadMessages.length > 0 ? threadMessages : message ? [message] : []
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      setExpandedMessages(new Set([latestMessage._id]))
    }
    setEditorMode("closed")
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
            <style>body { font-family: Arial, sans-serif; margin: 20px; } .header { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; } .content { line-height: 1.6; }</style>
          </head>
          <body>
            <div class="header">
              <h2>${message.subject}</h2>
              <p><strong>From:</strong> ${message.from}</p>
              <p><strong>To:</strong> ${message.to.join(", ")}</p>
              <p><strong>Date:</strong> ${new Date(message.created_at).toLocaleString()}</p>
            </div>
            <div class="content">${message.html}</div>
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ read: false }),
    }).then(() => onBack())
  }

  const handleUnMarkSpam = async (messageId: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
              <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
              {isThread && (
                <button className="p-1 hover:bg-gray-200 rounded">
                  <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          {!isExpanded && isThread && <div className="mt-2">{<p className="text-sm text-gray-600 truncate">{msg.text}</p>}</div>}
        </div>

        {isExpanded && (
          <div className="p-4">
            <div className="mb-4">
              <button onClick={() => setShowFullHeaders(!showFullHeaders)} className="text-xs text-blue-600 hover:text-blue-800">
                {showFullHeaders ? "Hide" : "Show"} full headers
              </button>
            </div>
            {showFullHeaders && (
              <div className="mb-4 p-3 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                <div><strong>Message-ID:</strong> {msg.message_id}</div>
                <div><strong>Date:</strong> {new Date(msg.created_at).toISOString()}</div>
                <div><strong>From:</strong> {msg.from}</div>
                <div><strong>To:</strong> {msg.to.join(", ")}</div>
                {msg.cc?.length > 0 && <div><strong>CC:</strong> {msg.cc.join(", ")}</div>}
                {msg.bcc?.length > 0 && <div><strong>BCC:</strong> {msg.bcc.join(", ")}</div>}
                <div><strong>Subject:</strong> {msg.subject}</div>
                {msg.in_reply_to && <div><strong>In-Reply-To:</strong> {msg.in_reply_to}</div>}
                {msg.references?.length > 0 && <div><strong>References:</strong> {msg.references.join(" ")}</div>}
              </div>
            )}
            {msg.folder === "spam" && <SpamBanner onMarkNotSpam={() => handleUnMarkSpam(msg._id)} />}
            <div className="mb-4">
              <EmailViewer html={msg.html} isSpam={msg.folder === "spam"} />
            </div>
            {msg.attachments?.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Attachments ({msg.attachments.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {msg.attachments.map((attachment: any) => {
                    const isSpam = msg.folder === "spam"
                    return (
                      <div
                        key={attachment._id}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition ${
                          isSpam
                            ? "bg-red-50 border border-red-200 text-red-700 cursor-not-allowed"
                            : "bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        }`}
                        onClick={() => !isSpam && downloadAttachment(attachment._id, attachment.filename)}
                      >
                        <PaperClipIcon className={`h-5 w-5 ${isSpam ? "text-red-400" : "text-gray-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSpam ? "text-red-800" : "text-gray-900"}`}>
                            {attachment.filename}
                          </p>
                          <p className={`text-xs ${isSpam ? "text-red-600" : "text-gray-500"}`}>
                            {attachment.mimeType} • {Math.round(attachment.size / 1024)} KB
                          </p>
                          {isSpam && (
                            <p className="text-xs text-red-500 mt-1">⚠ Attachment blocked. Mark as "not spam" to download.</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {msg.labels?.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center space-x-2">
                  <TagIcon className="h-4 w-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {msg.labels.map((label: string) => (
                      <span key={label} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
          <p>No message selected</p>
        </div>
      </div>
    )
  }

  const displayMessages = threadMessages.length > 0 ? threadMessages : [message]
  const latestMessage = displayMessages[displayMessages.length - 1]

  const localDraft = localStorage.getItem(`draft-${latestMessage._id}`)
  if (localDraft && editorMode === "closed") {
    const draft = JSON.parse(localDraft)
    setEditorMode(draft.type === "reply" ? "reply" : "forward")
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button onClick={onBack} title="Go back" className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>

            <div className="w-px bg-gray-200 h-6 mx-1"></div>

            {latestMessage.folder === "inbox" && (
              <>
                <button title="Archive" onClick={() => onArchive(latestMessage._id)} className="p-2 hover:bg-gray-100 rounded-full">
                  <Archive className="h-5 w-5 text-gray-500" />
                </button>
                <button title="Mark as spam" onClick={() => markAsSpam(latestMessage._id)} className="p-2 hover:bg-gray-100 rounded-full">
                  <OctagonAlert className="h-5 w-5 text-gray-500" />
                </button>
                <button title="Delete" onClick={() => onDelete(latestMessage._id)} className="p-2 hover:bg-gray-100 rounded-full">
                  <TrashIcon className="h-5 w-5 text-gray-500" />
                </button>
              </>
            )}

            {latestMessage.folder === "spam" && (
               <>
                <button onClick={() => handleDeleteForever(latestMessage._id)} className="px-3 py-2 text-sm hover:bg-gray-100 rounded-md text-gray-600">Delete forever</button>
                <button onClick={() => handleUnMarkSpam(latestMessage._id)} className="px-3 py-2 text-sm hover:bg-gray-100 rounded-md text-gray-600 bg-gray-50">Not spam</button>
              </>
            )}

            {latestMessage.folder === "trash" && (
                <button onClick={() => handleDeleteForever(latestMessage._id)} className="px-3 py-2 text-sm hover:bg-gray-100 rounded-md text-gray-600">Delete forever</button>
            )}
            
            {(latestMessage.folder === "inbox" || latestMessage.folder === "archive") && (
                <>
                    <div className="w-px bg-gray-200 h-6 mx-1"></div>
                    <button title="Mark as unread" onClick={() => markAsUnRead(latestMessage._id)} className="p-2 hover:bg-gray-100 rounded-full">
                      <MailMinus className="h-5 w-5 text-gray-500" />
                    </button>
                </>
            )}

            <button title={latestMessage.starred ? "Unstar" : "Star"} onClick={() => onStar(latestMessage._id, !latestMessage.starred)} className="p-2 hover:bg-gray-100 rounded-full">
              {latestMessage.starred ? <StarIconSolid className="h-5 w-5 text-yellow-500" /> : <StarIcon className="h-5 w-5 text-gray-500" />}
            </button>

            <Dropdown
              trigger={
                <button title="More options" className="p-2 hover:bg-gray-100 rounded-full">
                  <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                </button>
              }
              items={[
                { label: "Reply", onClick: () => setEditorMode("reply"), icon: ArrowUturnLeftIcon },
                { label: "Forward", onClick: () => setEditorMode("forward"), icon: ArrowUturnRightIcon },
                { label: "Print", onClick: printMessage, icon: PrinterIcon },
              ]}
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              {currentMessage} of {totalMessages}
            </div>
            <div className="flex flex-row">
              <button onClick={onPrevious} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50" disabled={currentMessage <= 1}>
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={onNext} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50" disabled={currentMessage >= totalMessages}>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 truncate">{latestMessage.subject}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.length > 1 && (
          <div className="mb-4 text-sm font-semibold text-gray-700">{displayMessages.length} messages in this conversation</div>
        )}
        {displayMessages.map((msg) => renderMessage(msg, displayMessages.length > 1))}

        {editorMode === "closed" && (
          <div className="flex items-center gap-3 ml-4 mt-5">
            <button
              onClick={() => setEditorMode("reply")}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              <span>Reply</span>
            </button>
            <button
              onClick={() => setEditorMode("forward")}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
              <span>Forward</span>
            </button>
          </div>
        )}

        {editorMode !== "closed" && latestMessage && (
          <div className="mt-6">
            <InlineReplyComposer
              originalMessage={latestMessage}
              composeMode={editorMode}
              onClose={() => setEditorMode("closed")}
              onSent={() => {
                setEditorMode("closed")
                onBack()
              }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t p-4 bg-white">
          <div className="flex items-center justify-center text-xs text-gray-500">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{width: '45%'}}></div>
              </div>
              <p>9.5 GB of 15 GB used</p>
            </div>
            <div className="flex-shrink-0 ml-6 space-x-4">
              <a href="#" className="hover:underline">Terms</a>
              <a href="#" className="hover:underline">Privacy</a>
              <a href="#" className="hover:underline">Program Policies</a>
            </div>
          </div>
      </div>


      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}