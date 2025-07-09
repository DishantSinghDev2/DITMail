"use client"

import { Input } from "@/components/ui/input"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { debounce } from "@/lib/utils"
import { emailSchema } from "@/lib/schemas"
import RichTextEditor, { type RichTextEditorRef } from "./rich-text-editor"
import AttachmentManager from "./attachment-manager"
import ContactAutocomplete from "./contact-autocomplete"
import SignatureSelector from "./signature-selector"
import { Send, Paperclip, ChevronUp, Trash2, Minimize2, Maximize2, X } from "lucide-react"

interface EmailEditorProps {
  onClose: () => void
  onSent: () => void
  onMinimize?: () => void
  onMaximize?: () => void
  replyToMessage?: any
  forwardMessage?: any
  initialDraftId?: string
  isMinimized?: boolean
  showWindowControls?: boolean
}

interface Attachment {
  _id: string
  name: string
  size: number
  type: string
  url?: string
}

export function EmailEditor({
  onClose,
  onSent,
  onMinimize,
  onMaximize,
  replyToMessage,
  forwardMessage,
  initialDraftId,
  isMinimized = false,
  showWindowControls = false,
}: EmailEditorProps) {
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draftId, setDraftId] = useState(initialDraftId)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([])
  const [quotedContent, setQuotedContent] = useState<string | null>(null)
  const [isQuoteVisible, setIsQuoteVisible] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [signatureHtml, setSignatureHtml] = useState("")
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<RichTextEditorRef>(null)

  const localStorageKey = useRef<string>(
    `draft-${replyToMessage?.message_id || forwardMessage?.message_id || initialDraftId || "new"}`,
  )

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: {
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      content: "",
      attachments: [],
    },
  })

  // Initialize editor content and form data
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true)
      const token = localStorage.getItem("accessToken")
      const conversationId = replyToMessage?.message_id || forwardMessage?.message_id
      let draftToLoadId = initialDraftId
      let finalContent = "<p></p>"
      let finalAttachments: Attachment[] = []
      let finalFormValues = { to: "", cc: "", bcc: "", subject: "", content: "" }

      // 1. Check for existing draft via API
      if (!draftToLoadId && conversationId) {
        try {
          const res = await fetch(`/api/drafts?in_reply_to_id=${encodeURIComponent(conversationId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            draftToLoadId = data.draft?._id
          }
        } catch (e) {
          console.warn("Could not search for existing draft.", e)
        }
      }

      // 2. Load draft from API if found
      if (draftToLoadId) {
        try {
          const res = await fetch(`/api/drafts/${draftToLoadId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) throw new Error("Draft not found in API")
          const { draft } = await res.json()
          setDraftId(draft._id)
          finalFormValues = {
            to: draft.to?.join(", ") || "",
            cc: draft.cc?.join(", ") || "",
            bcc: draft.bcc?.join(", ") || "",
            subject: draft.subject || "",
            content: draft.html || "<p></p>",
          }
          finalAttachments = draft.attachments || []
        } catch (error) {
          console.error("Failed to load draft from API.", error)
        }
      }
      // 3. Set up reply/forward state
      else if (replyToMessage) {
        finalFormValues.to = replyToMessage.from
        finalFormValues.subject = replyToMessage.subject.startsWith("Re:")
          ? replyToMessage.subject
          : `Re: ${replyToMessage.subject}`
        const formattedDate = format(new Date(replyToMessage.created_at), "MMM d, yyyy, h:mm a")
        const header = `<p><br></p><p>On ${formattedDate}, ${replyToMessage.from} wrote:</p>`
        finalContent = `<p></p>${header}<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${replyToMessage.html}</blockquote>`
        setQuotedContent(
          `<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${replyToMessage.html}</blockquote>`,
        )
        setIsQuoteVisible(true)
      } else if (forwardMessage) {
        finalFormValues.subject = forwardMessage.subject.startsWith("Fwd:")
          ? forwardMessage.subject
          : `Fwd: ${forwardMessage.subject}`
        const formattedDate = format(new Date(forwardMessage.created_at), "MMM d, yyyy, h:mm a")
        const header = `<p><br></p><p>---------- Forwarded message ---------<br>From: ${forwardMessage.from}<br>Date: ${formattedDate}<br>Subject: ${forwardMessage.subject}<br>To: ${forwardMessage.to?.join(", ")}</p>`
        finalContent = `<p></p>${header}<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${forwardMessage.html}</blockquote>`
        finalAttachments = forwardMessage.attachments || []
        setQuotedContent(
          `<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${forwardMessage.html}</blockquote>`,
        )
        setIsQuoteVisible(true)
      }

      // 4. Populate form and editor
      if (finalFormValues.content === "") {
        finalFormValues.content = finalContent
      }
      form.reset(finalFormValues)
      setUploadedAttachments(finalAttachments)
      if (finalFormValues.cc || finalFormValues.bcc) setShowCcBcc(true)

      // Set editor content after a brief delay to ensure editor is ready
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.setContent(finalFormValues.content)
          editorRef.current.focus()
        }
      }, 100)

      setIsInitializing(false)
    }

    initialize()
  }, [replyToMessage, forwardMessage, initialDraftId, form])

  // Auto-save drafts
  const saveDraft = useCallback(
    async (data: any, attachments: Attachment[]) => {
      const formContent = editorRef.current?.getContent() || data.content
      if (!data.subject && formContent === "<p></p>" && attachments.length === 0) return

      const saveData = { ...data, content: formContent }
      localStorage.setItem(localStorageKey.current, JSON.stringify({ values: saveData, attachments }))

      setIsSaving(true)
      const payload = {
        to: data.to
          .split(",")
          .map((e: string) => e.trim())
          .filter(Boolean),
        cc:
          data.cc
            ?.split(",")
            .map((e: string) => e.trim())
            .filter(Boolean) || [],
        bcc:
          data.bcc
            ?.split(",")
            .map((e: string) => e.trim())
            .filter(Boolean) || [],
        subject: data.subject,
        html: formContent,
        attachments: attachments.map((att) => att._id),
        in_reply_to_id: replyToMessage?.message_id || forwardMessage?.message_id,
      }

      try {
        const token = localStorage.getItem("accessToken")
        const url = draftId ? `/api/drafts/${draftId}` : "/api/drafts"
        const method = draftId ? "PATCH" : "POST"
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
        if (response.ok) {
          const result = await response.json()
          if (!draftId) setDraftId(result.draft._id)
          setLastSaved(new Date())
        }
      } catch (error) {
        console.error("Auto-save error:", error)
      } finally {
        setIsSaving(false)
      }
    },
    [draftId, replyToMessage, forwardMessage],
  )

  const debouncedSave = useCallback(debounce(saveDraft, 2000), [saveDraft])

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (form.formState.isDirty && !isInitializing) {
        debouncedSave(value as z.infer<typeof emailSchema>, uploadedAttachments)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, debouncedSave, uploadedAttachments, isInitializing])

  // Handle file uploads
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Optimistically update UI first
    const tempAttachments = Array.from(files).map((file) => ({
      _id: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      isUploading: true,
    }))

    setUploadedAttachments((prev) => [...prev, ...tempAttachments])

    // Upload files in background
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const tempId = tempAttachments[i]._id
      const formData = new FormData()
      formData.append("file", file)

      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/attachments", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!response.ok) throw new Error(`Failed to upload ${file.name}`)
        const result = await response.json()

        // Replace temp attachment with real one
        setUploadedAttachments((prev) => prev.map((att) => (att._id === tempId ? result.attachment : att)))
      } catch (error) {
        // Remove failed upload
        setUploadedAttachments((prev) => prev.filter((att) => att._id !== tempId))
        toast({
          title: "Attachment Error",
          description: (error as Error).message,
          variant: "destructive",
        })
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemoveAttachment = (attachmentIdToRemove: string) => {
    setUploadedAttachments((prev) => prev.filter((att) => att._id !== attachmentIdToRemove))
  }

  const cleanup = async () => {
    localStorage.removeItem(localStorageKey.current)
    if (draftId) {
      const token = localStorage.getItem("accessToken")
      await fetch(`/api/drafts/${draftId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  }

  const handleDeleteDraft = async () => {
    await cleanup()
    toast({ title: "Draft Discarded" })
    onClose()
  }

  const handleSignatureChange = (signatureId: string | null, html: string) => {
    setSelectedSignature(signatureId)
    setSignatureHtml(html)
  }

  async function onSubmit(values: z.infer<typeof emailSchema>) {
    setIsSending(true)
    try {
      let finalHtml = values.content

      // Add signature if selected
      if (signatureHtml) {
        finalHtml = `${values.content}<br><br>${signatureHtml}`
      }

      // Add quoted content if visible
      if (isQuoteVisible && quotedContent) {
        finalHtml = `${finalHtml}<br>${quotedContent}`
      }

      const token = localStorage.getItem("accessToken")
      const payload = {
        to: values.to.split(",").map((e) => e.trim()),
        cc:
          values.cc
            ?.split(",")
            .map((e) => e.trim())
            .filter(Boolean) || [],
        bcc:
          values.bcc
            ?.split(",")
            .map((e) => e.trim())
            .filter(Boolean) || [],
        subject: values.subject,
        html: finalHtml,
        attachments: uploadedAttachments.map((att) => att._id),
        ...(replyToMessage && {
          in_reply_to: replyToMessage.message_id,
          references: [...(replyToMessage.references || []), replyToMessage.message_id],
        }),
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to send email.")

      if (draftId) {
        await fetch(`/api/drafts/${draftId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      toast({ title: "Success", description: "Your email has been sent." })
      await cleanup()
      onSent()
      onClose()
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (isMinimized) {
    return (
      <div className="p-2 bg-gray-100 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 truncate">{form.getValues("subject") || "New Message"}</span>
          <div className="flex items-center space-x-1">
            {onMaximize && (
              <Button variant="ghost" size="sm" onClick={onMaximize} className="h-6 w-6 p-0">
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Window Controls */}
      {showWindowControls && (
        <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
          <span className="text-sm font-medium text-gray-700">
            {replyToMessage ? "Reply" : forwardMessage ? "Forward" : "New Message"}
          </span>
          <div className="flex items-center space-x-1">
            {onMinimize && (
              <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
                <Minimize2 className="h-3 w-3" />
              </Button>
            )}
            {onMaximize && (
              <Button variant="ghost" size="sm" onClick={onMaximize} className="h-6 w-6 p-0">
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          {/* Email Fields */}
          <div className="p-4 border-b space-y-3 flex-shrink-0">
            {/* To Field */}
            <div className="flex items-center">
              <label className="w-12 text-sm text-gray-600 flex-shrink-0">To</label>
              <div className="flex-1 flex items-center">
                <FormField
                  control={form.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <ContactAutocomplete
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Recipients"
                          className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex items-center ml-2 space-x-1">
                  {!showCcBcc && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCcBcc(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
                      >
                        Cc
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCcBcc(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
                      >
                        Bcc
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CC/BCC Fields */}
            {showCcBcc && (
              <>
                <div className="flex items-center">
                  <label className="w-12 text-sm text-gray-600 flex-shrink-0">Cc</label>
                  <div className="flex-1 flex items-center">
                    <FormField
                      control={form.control}
                      name="cc"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <ContactAutocomplete
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Carbon copy recipients"
                              className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCcBcc(false)}
                      className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="w-12 text-sm text-gray-600 flex-shrink-0">Bcc</label>
                  <FormField
                    control={form.control}
                    name="bcc"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <ContactAutocomplete
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Blind carbon copy recipients"
                            className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Subject Field */}
            <div className="flex items-center">
              <label className="w-12 text-sm text-gray-600 flex-shrink-0">Subject</label>
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Subject"
                        className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 p-4 overflow-hidden">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormControl>
                    <RichTextEditor
                      ref={editorRef}
                      placeholder="Compose your message..."
                      onChange={field.onChange}
                      className="h-full"
                      minHeight="200px"
                      maxHeight="none"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Quoted Content Toggle */}
          {quotedContent && (
            <div className="px-4 flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsQuoteVisible(!isQuoteVisible)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {isQuoteVisible ? "Hide quoted text" : "Show quoted text"}
              </Button>
              {isQuoteVisible && (
                <div
                  className="mt-2 p-3 bg-gray-50 border-l-4 border-gray-300 text-sm max-h-40 overflow-y-auto gmail-scrollbar"
                  dangerouslySetInnerHTML={{ __html: quotedContent }}
                />
              )}
            </div>
          )}

          {/* Attachments */}
          <div className="px-4 flex-shrink-0">
            <AttachmentManager
              attachments={uploadedAttachments}
              onAttachmentsChange={setUploadedAttachments}
              onRemoveAttachment={handleRemoveAttachment}
            />
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
            <div className="flex items-center justify-between mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-800"
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Attach files
              </Button>
              <SignatureSelector selectedSignature={selectedSignature} onSignatureChange={handleSignatureChange} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={isSending} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send"}
              </Button>
              <Button type="button" variant="outline" onClick={handleDeleteDraft}>
                <Trash2 className="h-4 w-4 mr-2" />
                Discard
              </Button>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              {isSaving && <span>Saving...</span>}
              {lastSaved && !isSaving && <span>Saved {format(lastSaved, "HH:mm")}</span>}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
