"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronDown, ChevronUp, Reply, ReplyAll, Forward, MoreHorizontal } from "lucide-react"
import RichTextEditor from "./rich-text-editor"
import EmailFields from "./email-fields"
import AttachmentManager from "./attachment-manager"

interface EmailMessage {
  id: string
  from: string
  to: string[]
  cc?: string[]
  subject: string
  content: string
  timestamp: Date
  attachments?: any[]
}

interface EmailThreadProps {
  messages: EmailMessage[]
  onReply: (messageId: string, content: string) => void
  onReplyAll: (messageId: string, content: string) => void
  onForward: (messageId: string, content: string) => void
}

export default function EmailThread({ messages, onReply, onReplyAll, onForward }: EmailThreadProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set([messages[messages.length - 1]?.id]))
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyType, setReplyType] = useState<"reply" | "replyAll" | "forward">("reply")

  // Reply form state
  const [replyTo, setReplyTo] = useState("")
  const [replyCc, setReplyCc] = useState("")
  const [replyBcc, setReplyBcc] = useState("")
  const [replySubject, setReplySubject] = useState("")
  const [replyFrom, setReplyFrom] = useState("your.email@gmail.com")
  const [replyContent, setReplyContent] = useState("")
  const [replyAttachments, setReplyAttachments] = useState<any[]>([])

  const toggleExpanded = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  const startReply = (messageId: string, type: "reply" | "replyAll" | "forward") => {
    const message = messages.find((m) => m.id === messageId)
    if (!message) return

    setReplyingTo(messageId)
    setReplyType(type)

    if (type === "reply") {
      setReplyTo(message.from)
      setReplySubject(`Re: ${message.subject}`)
    } else if (type === "replyAll") {
      setReplyTo([message.from, ...message.to].join(", "))
      setReplyCc(message.cc?.join(", ") || "")
      setReplySubject(`Re: ${message.subject}`)
    } else if (type === "forward") {
      setReplyTo("")
      setReplySubject(`Fwd: ${message.subject}`)
      setReplyContent(
        `\n\n---------- Forwarded message ---------\nFrom: ${message.from}\nDate: ${message.timestamp.toLocaleString()}\nSubject: ${message.subject}\nTo: ${message.to.join(", ")}\n\n${message.content}`,
      )
    }
  }

  const handleSendReply = () => {
    if (!replyingTo) return

    if (replyType === "reply") {
      onReply(replyingTo, replyContent)
    } else if (replyType === "replyAll") {
      onReplyAll(replyingTo, replyContent)
    } else if (replyType === "forward") {
      onForward(replyingTo, replyContent)
    }

    // Reset form
    setReplyingTo(null)
    setReplyTo("")
    setReplyCc("")
    setReplyBcc("")
    setReplySubject("")
    setReplyContent("")
    setReplyAttachments([])
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {messages.map((message, index) => (
        <Card key={message.id} className="overflow-hidden">
          {/* Message Header */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleExpanded(message.id)}
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {message.from.split("@")[0].charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">{message.from}</div>
                <div className="text-xs text-gray-500">
                  to {message.to.join(", ")}
                  {message.cc && message.cc.length > 0 && <span>, cc {message.cc.join(", ")}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
              {expandedMessages.has(message.id) ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Message Content */}
          {expandedMessages.has(message.id) && (
            <div className="border-t">
              <div className="p-4">
                <div className="text-sm mb-4 font-medium">{message.subject}</div>
                <div
                  className="prose prose-sm max-w-none gmail-scrollbar max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: message.content }}
                />

                {message.attachments && message.attachments.length > 0 && (
                  <AttachmentManager
                    attachments={message.attachments}
                    onAttachmentsChange={() => {}}
                    className="mt-4"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => startReply(message.id, "reply")} className="text-xs">
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startReply(message.id, "replyAll")}
                    className="text-xs"
                  >
                    <ReplyAll className="h-3 w-3 mr-1" />
                    Reply all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startReply(message.id, "forward")}
                    className="text-xs"
                  >
                    <Forward className="h-3 w-3 mr-1" />
                    Forward
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Inline Reply/Forward Composer */}
      {replyingTo && (
        <Card className="mt-4">
          <div className="p-4">
            <div className="text-sm font-medium mb-4 text-blue-600">
              {replyType === "reply" && "Reply"}
              {replyType === "replyAll" && "Reply to all"}
              {replyType === "forward" && "Forward"}
            </div>

            <EmailFields
              to={replyTo}
              cc={replyCc}
              bcc={replyBcc}
              subject={replySubject}
              from={replyFrom}
              onToChange={setReplyTo}
              onCcChange={setReplyCc}
              onBccChange={setReplyBcc}
              onSubjectChange={setReplySubject}
              onFromChange={setReplyFrom}
              showCc={replyCc !== ""}
              showBcc={replyBcc !== ""}
            />

            <div className="mt-4">
              <RichTextEditor
                placeholder="Type your message..."
                onChange={setReplyContent}
                initialContent={replyContent}
              />
            </div>

            <AttachmentManager attachments={replyAttachments} onAttachmentsChange={setReplyAttachments} />

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button onClick={handleSendReply} className="bg-blue-600 hover:bg-blue-700">
                Send
              </Button>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                  Discard
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
