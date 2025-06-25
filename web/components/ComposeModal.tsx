"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { PaperClipIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline"
import { debounce } from "lodash"
import Modal from "./ui/Modal"

interface ComposeModalProps {
  onClose: () => void
  onSent: () => void
  replyTo?: any
  forwardMessage?: any
  draftId?: string
}

export default function ComposeModal({ onClose, onSent, replyTo, forwardMessage, draftId }: ComposeModalProps) {
  const [formData, setFormData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    signature: "",
    priority: "normal",
    requestReadReceipt: false,
  })
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([])
  const [signatures, setSignatures] = useState([])
  const [selectedSignature, setSelectedSignature] = useState("")
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [currentDraftId, setCurrentDraftId] = useState(draftId)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [contacts, setContacts] = useState([])
  const [showContacts, setShowContacts] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Email validation
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

  // Auto-save function with error handling
  const autoSave = useCallback(
    debounce(async (data) => {
      if (!data.to && !data.subject && !data.body) return

      setAutoSaving(true)
      try {
        const token = localStorage.getItem("accessToken")
        const url = currentDraftId ? `/api/drafts/${currentDraftId}` : "/api/drafts"
        const method = currentDraftId ? "PATCH" : "POST"

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: data.to
              .split(",")
              .map((email: string) => email.trim())
              .filter(Boolean),
            cc: data.cc
              ? data.cc
                  .split(",")
                  .map((email: string) => email.trim())
                  .filter(Boolean)
              : [],
            bcc: data.bcc
              ? data.bcc
                  .split(",")
                  .map((email: string) => email.trim())
                  .filter(Boolean)
              : [],
            subject: data.subject,
            html: data.body.replace(/\n/g, "<br>"),
            text: data.body,
            signature: data.signature,
            priority: data.priority,
            attachments: uploadedAttachments.map((att) => att._id),
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (!currentDraftId) {
            setCurrentDraftId(result.draft._id)
          }
          setLastSaved(new Date())
        }
      } catch (error) {
        console.error("Auto-save error:", error)
        // Send notification via API instead of direct service call
        try {
          const token = localStorage.getItem("accessToken")
          await fetch("/api/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: "security",
              title: "Auto-save Failed",
              message: "Failed to auto-save draft",
              data: { error: error.message },
            }),
          })
        } catch (notifError) {
          console.error("Failed to send notification:", notifError)
        }
      } finally {
        setAutoSaving(false)
      }
    }, 2000),
    [currentDraftId, uploadedAttachments],
  )

  // Load signatures and contacts
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("accessToken")

        // Load signatures
        const sigResponse = await fetch("/api/signatures", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (sigResponse.ok) {
          const sigData = await sigResponse.json()
          setSignatures(sigData.signatures)

          const defaultSig = sigData.signatures.find((sig: any) => sig.is_default)
          if (defaultSig) {
            setSelectedSignature(defaultSig._id)
            setFormData((prev) => ({ ...prev, signature: defaultSig.html }))
          }
        }

        // Load contacts (recent email addresses)
        const contactsResponse = await fetch("/api/contacts", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json()
          setContacts(contactsData.contacts)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
  }, [])

  // Load draft if editing
  useEffect(() => {
    if (draftId) {
      const loadDraft = async () => {
        try {
          const token = localStorage.getItem("accessToken")
          const response = await fetch(`/api/drafts/${draftId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })

          if (response.ok) {
            const data = await response.json()
            const draft = data.draft
            setFormData({
              to: draft.to.join(", "),
              cc: draft.cc?.join(", ") || "",
              bcc: draft.bcc?.join(", ") || "",
              subject: draft.subject,
              body: draft.text || "",
              signature: draft.signature || "",
              priority: draft.priority || "normal",
              requestReadReceipt: draft.requestReadReceipt || false,
            })
            setShowCc(draft.cc?.length > 0)
            setShowBcc(draft.bcc?.length > 0)
            setUploadedAttachments(draft.attachments || [])
          }
        } catch (error) {
          console.error("Error loading draft:", error)
        }
      }

      loadDraft()
    }
  }, [draftId])

  // Setup reply/forward data
  useEffect(() => {
    if (replyTo) {
      setFormData((prev) => ({
        ...prev,
        to: replyTo.from,
        subject: replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`,
        body: `\n\n--- Original Message ---\nFrom: ${replyTo.from}\nDate: ${new Date(replyTo.created_at).toLocaleString()}\nSubject: ${replyTo.subject}\n\n${replyTo.text || ""}`,
      }))
    }

    if (forwardMessage) {
      setFormData((prev) => ({
        ...prev,
        subject: forwardMessage.subject.startsWith("Fwd:") ? forwardMessage.subject : `Fwd: ${forwardMessage.subject}`,
        body: `\n\n--- Forwarded Message ---\nFrom: ${forwardMessage.from}\nTo: ${forwardMessage.to.join(", ")}\nDate: ${new Date(forwardMessage.created_at).toLocaleString()}\nSubject: ${forwardMessage.subject}\n\n${forwardMessage.text || ""}`,
      }))
    }
  }, [replyTo, forwardMessage])

  // Auto-save when form data changes
  useEffect(() => {
    autoSave(formData)
  }, [formData, autoSave])

  // Validate form
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
        const formData = new FormData()
        formData.append("file", file)

        const uploadResponse = await fetch("/api/attachments", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
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
          html: formData.body.replace(/\n/g, "<br>") + (formData.signature ? `<br><br>${formData.signature}` : ""),
          text: formData.body + (formData.signature ? `\n\n${formData.signature}` : ""),
          attachments: uploadedAttachments.map((att) => att._id),
          priority: formData.priority,
          requestReadReceipt: formData.requestReadReceipt,
          isDraft: false,
        }),
      })

      if (response.ok) {
        // Delete draft if it exists
        if (currentDraftId) {
          await fetch(`/api/drafts/${currentDraftId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        }

        // Send success notification via API
        await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: "email",
            title: "Email Sent",
            message: `Email "${formData.subject}" sent successfully`,
            data: { subject: formData.subject, recipients: formData.to.split(",").length },
          }),
        })

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setAttachments([...attachments, ...files])

      // Upload files immediately
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)

        try {
          setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))

          const token = localStorage.getItem("accessToken")
          const response = await fetch("/api/attachments", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })

          if (response.ok) {
            const data = await response.json()
            setUploadedAttachments((prev) => [...prev, data.attachment])
            setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
          }
        } catch (error) {
          console.error("Upload error:", error)
          setErrors((prev) => ({ ...prev, [file.name]: "Upload failed" }))
        }
      }
    }
  }

  const handleRemoveAttachment = async (index: number, attachmentId?: string) => {
    if (attachmentId) {
      try {
        const token = localStorage.getItem("accessToken")
        await fetch(`/api/attachments/${attachmentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
        setUploadedAttachments((prev) => prev.filter((att) => att._id !== attachmentId))
      } catch (error) {
        console.error("Error deleting attachment:", error)
      }
    } else {
      setAttachments((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleSignatureChange = (signatureId: string) => {
    const signature = signatures.find((sig: any) => sig._id === signatureId)
    setSelectedSignature(signatureId)
    setFormData((prev) => ({ ...prev, signature: signature?.html || "" }))
  }

  const insertContact = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      to: prev.to ? `${prev.to}, ${email}` : email,
    }))
    setShowContacts(false)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Compose Message" size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
          <div className="relative">
            <input
              type="text"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              onFocus={() => setShowContacts(true)}
              onBlur={() => setTimeout(() => setShowContacts(false), 200)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.to ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="recipient@example.com"
              required
            />
            {showContacts && contacts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {contacts.slice(0, 5).map((contact: any, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => insertContact(contact.email)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                  >
                    <div className="font-medium">{contact.name || contact.email}</div>
                    <div className="text-gray-500 text-xs">{contact.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
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

        {/* Priority and Options */}
        <div className="flex space-x-4">
          <div className="flex-1">
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
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.requestReadReceipt}
                onChange={(e) => setFormData({ ...formData, requestReadReceipt: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Request read receipt</span>
            </label>
          </div>
        </div>

        {/* Message Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea
            ref={bodyRef}
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={12}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.body ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Type your message here..."
            required
          />
          {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body}</p>}
        </div>

        {/* Signature */}
        {signatures.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
            <select
              value={selectedSignature}
              onChange={(e) => handleSignatureChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No signature</option>
              {signatures.map((sig: any) => (
                <option key={sig._id} value={sig._id}>
                  {sig.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Attachments */}
        <div>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <PaperClipIcon className="h-4 w-4" />
            <span className="text-sm">Attach files</span>
          </button>

          {/* Attachment List */}
          {(attachments.length > 0 || uploadedAttachments.length > 0) && (
            <div className="mt-2 space-y-1">
              {uploadedAttachments.map((attachment, index) => (
                <div key={attachment._id} className="flex items-center justify-between p-2 bg-green-50 rounded border">
                  <div className="flex items-center space-x-2">
                    <PaperClipIcon className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{attachment.filename}</span>
                    <span className="text-xs text-green-600">({Math.round(attachment.size / 1024)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index, attachment._id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                  <div className="flex items-center space-x-2">
                    <PaperClipIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">{file.name}</span>
                    <span className="text-xs text-blue-600">({Math.round(file.size / 1024)} KB)</span>
                    {uploadProgress[file.name] !== undefined && (
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[file.name]}%` }}
                        ></div>
                      </div>
                    )}
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

        {/* Auto-save Status */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            {autoSaving && <span>Saving draft...</span>}
            {lastSaved && !autoSaving && <span>Draft saved at {lastSaved.toLocaleTimeString()}</span>}
          </div>
        </div>

        {/* General Error */}
        {errors.general && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{errors.general}</div>}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span>{sending ? "Sending..." : "Send"}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
