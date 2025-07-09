// components/InlineCompose.tsx
"use client"

import { useState, useEffect } from "react"
import { EmailEditor } from "./email-editor/EmailEditor"
import { PaperAirplaneIcon, XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/solid"

interface InlineComposeProps {
  mode: "reply" | "forward"
  messageToRespond: any
  onCancel: () => void
  onSend: () => void
}

export default function InlineCompose({ mode, messageToRespond, onCancel, onSend }: InlineComposeProps) {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [htmlBody, setHtmlBody] = useState("")
  const [textBody, setTextBody] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (mode === "reply") {
      setTo(messageToRespond.from)
      setSubject(
        messageToRespond.subject.startsWith("Re:") ? messageToRespond.subject : `Re: ${messageToRespond.subject}`
      )
      const originalMessageQuote = `
        <br><br>
        <blockquote style="border-left: 2px solid #ccc; margin-left: 5px; padding-left: 10px; color: #666;">
          On ${new Date(messageToRespond.created_at).toLocaleString()}, ${messageToRespond.from} wrote:<br>
          ${messageToRespond.html}
        </blockquote>
      `
      setHtmlBody(originalMessageQuote)
    } else if (mode === "forward") {
      setSubject(
        messageToRespond.subject.startsWith("Fwd:") ? messageToRespond.subject : `Fwd: ${messageToRespond.subject}`
      )
      const forwardedMessage = `
        <br><br>
        <div style="border-top: 1px solid #ccc; margin-top: 10px; padding-top: 10px;">
          <p>---------- Forwarded message ----------</p>
          <p><strong>From:</strong> ${messageToRespond.from}</p>
          <p><strong>Date:</strong> ${new Date(messageToRespond.created_at).toLocaleString()}</p>
          <p><strong>Subject:</strong> ${messageToRespond.subject}</p>
          <p><strong>To:</strong> ${messageToRespond.to.join(", ")}</p>
          <br>
          ${messageToRespond.html}
        </div>
      `
      setHtmlBody(forwardedMessage)
    }
  }, [mode, messageToRespond])

  const handleBodyChange = (html: string, text: string) => {
    setHtmlBody(html)
    setTextBody(text)
  }

  const handleSend = async () => {
    if (!to || !subject) {
      alert("To and Subject fields are required.")
      return
    }
    setIsSending(true)
    try {
      const token = localStorage.getItem("accessToken")
      const payload = {
        to: to.split(",").map((email) => email.trim()),
        cc: cc ? cc.split(",").map((email) => email.trim()) : [],
        bcc: bcc ? bcc.split(",").map((email) => email.trim()) : [],
        subject,
        html: htmlBody,
        text: textBody,
        in_reply_to: mode === "reply" ? messageToRespond.message_id : null,
        references: mode === "reply" ? [...(messageToRespond.references || []), messageToRespond.message_id] : null,
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        onSend()
      } else {
        const errorData = await response.json()
        alert(`Failed to send email: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Failed to send email:", error)
      alert("An unexpected error occurred. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const wrapperClass = isMaximized
    ? "fixed inset-0 z-50 bg-white flex flex-col shadow-2xl"
    : "relative border-t border-gray-200"

  return (
    <div className={wrapperClass}>
      <div className="flex-shrink-0 bg-gray-100 p-2 text-sm text-gray-700 flex justify-between items-center">
        <span className="font-medium">{mode === "reply" ? "Reply" : "Forward"}</span>
        <div>
          {isMaximized && (
            <span className="text-xs mr-4 px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Maximized</span>
          )}
          <button onClick={() => setIsMaximized(!isMaximized)} className="p-1 hover:bg-gray-200 rounded-full mr-2">
            {isMaximized ? <ArrowsPointingInIcon className="h-4 w-4" /> : <ArrowsPointingOutIcon className="h-4 w-4" />}
          </button>
          <button onClick={onCancel} className="p-1 hover:bg-gray-200 rounded-full">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className={`p-4 space-y-2 flex-grow ${isMaximized ? 'overflow-y-auto' : ''}`}>
        <div className="flex items-center text-sm border-b">
          <label className="text-gray-500 pr-2">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-grow p-1 focus:outline-none"
          />
          <button onClick={() => setShowCc(!showCc)} className="text-xs text-gray-500 hover:text-black p-1">Cc</button>
          <button onClick={() => setShowBcc(!showBcc)} className="text-xs text-gray-500 hover:text-black p-1">Bcc</button>
        </div>
        {showCc && (
           <div className="flex items-center text-sm border-b">
            <label className="text-gray-500 pr-2">Cc</label>
            <input type="text" value={cc} onChange={e => setCc(e.target.value)} className="flex-grow p-1 focus:outline-none" />
          </div>
        )}
         {showBcc && (
           <div className="flex items-center text-sm border-b">
            <label className="text-gray-500 pr-2">Bcc</label>
            <input type="text" value={bcc} onChange={e => setBcc(e.target.value)} className="flex-grow p-1 focus:outline-none" />
          </div>
        )}
        <div className="flex items-center text-sm border-b">
           <label className="text-gray-500 pr-2">Subject</label>
           <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="flex-grow p-1 focus:outline-none" />
        </div>
        <div className={isMaximized ? 'flex-grow' : ''}>
           <EmailEditor content={htmlBody} onChange={handleBodyChange} />
        </div>
      </div>
      <div className="flex-shrink-0 p-3 flex items-center justify-between border-t">
        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          <span>{isSending ? "Sending..." : "Send"}</span>
        </button>
      </div>
    </div>
  )
}