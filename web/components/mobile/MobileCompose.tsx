"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { PaperClipIcon, PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/24/outline"

interface MobileComposeProps {
  onClose: () => void
  onSent: () => void
  replyMessage?: any
}

export default function MobileCompose({ onClose, onSent, replyMessage }: MobileComposeProps) {
  const [formData, setFormData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    priority: "normal",
  })
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (replyMessage) {
      setFormData({
        to: replyMessage.from,
        cc: "",
        bcc: "",
        subject: replyMessage.subject.startsWith("Re:") ? replyMessage.subject : `Re: ${replyMessage.subject}`,
        body: `\n\n--- Original Message ---\nFrom: ${replyMessage.from}\nDate: ${new Date(replyMessage.created_at).toLocaleString()}\nSubject: ${replyMessage.subject}\n\n${replyMessage.text || ""}`,
        priority: "normal",
      })
    }
  }, [replyMessage])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateEmails = (emailString: string) => {
    if (!emailString.trim()) return []
    const emails = emailString.split(",").map((email) => email.trim())
    const invalidEmails = emails.filter((email) => !validateEmail(email))
    return invalidEmails
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    const invalidToEmails = validateEmails(formData.to)
    if (invalidToEmails.length > 0) {
      newErrors.to = `Invalid email addresses: ${invalidToEmails.join(", ")}`
    }

    const invalidCcEmails = validateEmails(formData.cc)
    if (invalidCcEmails.length > 0) {
      newErrors.cc = `Invalid email addresses: ${invalidCcEmails.join(", ")}`
    }

    const invalidBccEmails = validateEmails(formData.bcc)
    if (invalidBccEmails.length > 0) {
      newErrors.bcc = `Invalid email addresses: ${invalidBccEmails.join(", ")}`
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required"
    }

    if (!formData.body.trim()) {
      newErrors.body = "Message body is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSending(true)

    try {
      const token = localStorage.getItem("accessToken")

      // Upload any remaining attachments
      for (const file of attachments) {
        const formDataUpload = new FormData()
        formDataUpload.append("file", file)

        const uploadResponse = await fetch("/api/attachments", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataUpload,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          setUploadedAttachments((prev) => [...prev, uploadData.attachment])
        }
      }

      // Send email
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: formData.to.split(",").map((email) => email.trim()),
          cc: formData.cc ? formData.cc.split(",").map((email) => email.trim()) : [],
          bcc: formData.bcc ? formData.bcc.split(",").map((email) => email.trim()) : [],
          subject: formData.subject,
          html: formData.body.replace(/\n/g, "<br>"),
          text: formData.body,
          attachments: uploadedAttachments.map((att) => att._id),
          priority: formData.priority,
          isDraft: false,
        }),
      })

      if (response.ok) {
        onSent()
        onClose()
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.error || "Failed to send email" })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setErrors({ general: "Failed to send email. Please try again." })
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setAttachments([...attachments, ...files])
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full">
          <XMarkIcon className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{replyMessage ? "Reply" : "Compose"}</h1>
        <button
          onClick={handleSubmit}
          disabled={sending}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          <span>{sending ? "Sending..." : "Send"}</span>
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* To Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
          <input
            type="text"
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.to ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="recipient@example.com"
            required
          />
          {errors.to && <p className="text-red-500 text-xs mt-1">{errors.to}</p>}
          <div className="mt-2 space-x-4">
            <button
              type="button"
              onClick={() => setShowCc(!showCc)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showCc ? "Hide" : "Add"} CC
            </button>
            <button
              type="button"
              onClick={() => setShowBcc(!showBcc)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showBcc ? "Hide" : "Add"} BCC
            </button>
          </div>
        </div>

        {/* CC Field */}
        {showCc && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
            <input
              type="text"
              value={formData.cc}
              onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cc ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="cc@example.com"
            />
            {errors.cc && <p className="text-red-500 text-xs mt-1">{errors.cc}</p>}
          </div>
        )}

        {/* BCC Field */}
        {showBcc && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
            <input
              type="text"
              value={formData.bcc}
              onChange={(e) => setFormData({ ...formData, bcc: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.bcc ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="bcc@example.com"
            />
            {errors.bcc && <p className="text-red-500 text-xs mt-1">{errors.bcc}</p>}
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.subject ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Email subject"
            required
          />
          {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Message Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea
            ref={bodyRef}
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={10}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.body ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Type your message here..."
            required
          />
          {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body}</p>}
        </div>

        {/* Attachments */}
        <div>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 w-full justify-center"
          >
            <PaperClipIcon className="h-4 w-4" />
            <span className="text-sm">Attach files</span>
          </button>

          {/* Attachment List */}
          {attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                  <div className="flex items-center space-x-2">
                    <PaperClipIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">{file.name}</span>
                    <span className="text-xs text-blue-600">({Math.round(file.size / 1024)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Error */}
        {errors.general && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{errors.general}</div>}
      </div>
    </div>
  )
}
