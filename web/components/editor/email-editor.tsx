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

// (Interfaces remain the same)
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

// --- NEW HELPER FUNCTION ---
// This function runs synchronously to get initial form values for an instant render.
const getInitialFormValues = (replyToMessage?: any, forwardMessage?: any) => {
  if (replyToMessage) {
    return {
      to: replyToMessage.from || "",
      cc: "",
      bcc: "",
      subject: replyToMessage.subject.startsWith("Re:") ? replyToMessage.subject : `Re: ${replyToMessage.subject}`,
      content: "",
      attachments: [],
    }
  }
  if (forwardMessage) {
    return {
      to: "",
      cc: "",
      bcc: "",
      subject: forwardMessage.subject.startsWith("Fwd:") ? forwardMessage.subject : `Fwd: ${forwardMessage.subject}`,
      content: "",
      attachments: [],
    }
  }
  return {
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    content: "",
    attachments: [],
  }
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
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([])
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [signatureHtml, setSignatureHtml] = useState("")
  // We no longer need isInitializing, as the UI renders instantly.
  // const [isInitializing, setIsInitializing] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<RichTextEditorRef>(null)
  const formInitialized = useRef(false) // Prevents auto-save on initial load.

  // --- REFACTORED: INSTANT INITIALIZATION ---
  // The form is initialized instantly with synchronous data.
  // API-dependent data will be loaded in a useEffect later.
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: getInitialFormValues(replyToMessage, forwardMessage),
  })

  // --- REFACTORED: ASYNCHRONOUS DATA LOADING ---
  // This effect runs *after* the initial render to fetch drafts or build quotes
  // without blocking the UI.
  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("accessToken")
      const conversationId = replyToMessage?.message_id || forwardMessage?.message_id
      let draftToLoadId = initialDraftId
      let loadedFromApi = false

      // 1. Check for an existing draft via API
      if (!draftToLoadId && conversationId) {
        try {
          // check if a draft exists for the conversation in local storage first
          const localDrafts = JSON.parse(localStorage.getItem(`draft-${conversationId}`) || "[]")
          if (localDrafts.length > 0) {
            draftToLoadId = localDrafts[0]._id // Use the first draft found
          }
        } catch (e) {
          console.warn("Could not search for existing draft.", e)
        }
      }

      // 2. If a draft exists, load its data
      if (draftToLoadId) {
        try {
          const res = await fetch(`/api/drafts/${draftToLoadId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) throw new Error("Draft not found in API")
          const { draft } = await res.json()

          // Reset the form with the fetched draft data
          form.reset({
            to: draft.to?.join(", ") || "",
            cc: draft.cc?.join(", ") || "",
            bcc: draft.bcc?.join(", ") || "",
            subject: draft.subject || "",
            content: draft.html || "<p></p>",
          })

          setDraftId(draft._id)
          setUploadedAttachments(draft.attachments || [])
          if (draft.cc?.length) {
            setShowCc(true)
          }
          if (draft.bcc?.length) {
            setShowBcc(true)
          }
          loadedFromApi = true
        } catch (error) {
          console.error("Failed to load draft from API, proceeding with standard reply/forward.", error)
        }
      }

      // 3. If no draft was loaded, set up reply/forward content
      if (!loadedFromApi) {
        let content = "<p></p>" // Start with an empty paragraph for the user to type in.
        let attachments: Attachment[] = []

        const createQuotedBlock = (message: any, type: 'reply' | 'forward') => {
          const formattedDate = format(new Date(message.created_at), "MMM d, yyyy, h:mm a")
          let header = ''
          if (type === 'reply') {
            header = `<p><br></p><p>On ${formattedDate}, ${message.from} wrote:</p>`
          } else {
            header = `<p><br></p><p>---------- Forwarded message ---------<br>From: ${message.from}<br>Date: ${formattedDate}<br>Subject: ${message.subject}<br>To: ${message.to?.join(", ")}</p>`
          }
          return `${header}<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${message.html}</blockquote>`
        }

        if (replyToMessage) {
          content += createQuotedBlock(replyToMessage, 'reply')
        } else if (forwardMessage) {
          content += createQuotedBlock(forwardMessage, 'forward')
          attachments = forwardMessage.attachments || []
          setUploadedAttachments(attachments)
        }

        // Only set content if it's different from the default
        if (content !== "<p></p>") {
          form.setValue("content", content, { shouldDirty: false })
        }
      }

      // 4. Set final content in the editor and focus
      // A small timeout ensures the editor component is fully ready.
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.setContent(form.getValues("content"))
          editorRef.current.focus()
          formInitialized.current = true; // Enable auto-save now
        }
      }, 50)
    }

    loadData()
    // We only want this to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraftId, replyToMessage, forwardMessage])

  // Auto-save drafts
  const saveDraft = useCallback(
    async (data: any, attachments: Attachment[]) => {
      const formContent = editorRef.current?.getContent() || data.content
      // Do not save if the form is empty
      if (!data.subject && (formContent === "<p></p>" || !formContent) && attachments.length === 0) return

      setIsSaving(true)
      const payload = {
        type: replyToMessage ? "r" : forwardMessage ? "f" : "d", // d = draft, r = reply, f = forward
        to: data.to.split(",").map((e: string) => e.trim()).filter(Boolean),
        cc: data.cc?.split(",").map((e: string) => e.trim()).filter(Boolean) || [],
        bcc: data.bcc?.split(",").map((e: string) => e.trim()).filter(Boolean) || [],
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
          // save draft to local storage immediately
          try {
            const existingDrafts = JSON.parse(localStorage.getItem(`draft-${replyToMessage?.message_id || forwardMessage?.message_id}`) || "[]")
            const updatedDrafts = existingDrafts.filter((d: any) => d._id !== draftId) // Remove any existing draft with the same ID
            updatedDrafts.push({ ...payload, _id: result.draft._id }) // Use a temp ID if no draftId exists
            localStorage.setItem(`draft-${replyToMessage?.message_id || forwardMessage?.message_id}`, JSON.stringify(updatedDrafts))
          } catch (error) {
            console.error("Failed to save draft to local storage:", error)
          }
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
      // Only start saving after the form has been initialized to avoid race conditions.
      if (formInitialized.current && form.formState.isDirty) {
        debouncedSave(value as z.infer<typeof emailSchema>, uploadedAttachments)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, debouncedSave, uploadedAttachments])


  // Handle file uploads
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // This function remains largely the same, as it's already optimistic.
    const files = e.target.files
    if (!files) return
    const tempAttachments = Array.from(files).map((file) => ({
      _id: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      isUploading: true,
    }))
    setUploadedAttachments((prev) => [...prev, ...tempAttachments])
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const tempId = tempAttachments[i]._id
      const formData = new FormData()
      formData.append("file", file)
      formData.append("message_id", draftId || "new") // Use draftId if available, otherwise "new"
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/attachments", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!response.ok) throw new Error(`Failed to upload ${file.name}`)
        const result = await response.json()
        setUploadedAttachments((prev) => prev.map((att) => (att._id === tempId ? result.attachment : att)))
      } catch (error) {
        setUploadedAttachments((prev) => prev.filter((att) => att._id !== tempId))
        toast({ title: "Attachment Error", description: (error as Error).message, variant: "destructive" })
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // (Other handlers: handleRemoveAttachment, cleanup, handleDeleteDraft, handleSignatureChange remain the same)
  const handleRemoveAttachment = (attachmentIdToRemove: string) => {
    setUploadedAttachments((prev) => prev.filter((att) => att._id !== attachmentIdToRemove));
  };

  const cleanup = async () => {
    if (draftId) {
      try {
        const token = localStorage.getItem("accessToken");
        await fetch(`/api/drafts/${draftId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error("Failed to delete draft from server, but proceeding.", error)
      }
    }
  };

  const handleDeleteDraft = async () => {
    await cleanup();
    toast({ title: "Draft Discarded" });
    onClose();
  };

  const handleSignatureChange = (signatureId: string | null, html: string) => {
    setSelectedSignature(signatureId);
    setSignatureHtml(html);
  };


  async function onSubmit(values: z.infer<typeof emailSchema>) {
    setIsSending(true)
    try {
      // NOTE: We get the most up-to-date content directly from the editor ref
      // to ensure we capture everything, including content set programmatically.
      let finalHtml = editorRef.current?.getContent() || values.content;

      // Add signature if selected.
      if (signatureHtml) {
        // A more robust way to add a signature is to check if it's already there.
        // For simplicity here, we assume the user hasn't manually added it.
        // Gmail often injects it into a non-editable block or right before the quote.
        // This logic prepends the signature to the user's content.
        const userContent = finalHtml.split('<blockquote style=')[0] || '<p></p>'
        const quotedBlock = finalHtml.includes('<blockquote style=') ? '<blockquote style=' + finalHtml.split('<blockquote style=')[1] : ''
        finalHtml = `${userContent}<br>--<br>${signatureHtml}<br>${quotedBlock}`
      }

      const token = localStorage.getItem("accessToken")
      const payload = {
        to: values.to.split(",").map((e) => e.trim()),
        cc: values.cc?.split(",").map((e) => e.trim()).filter(Boolean) || [],
        bcc: values.bcc?.split(",").map((e) => e.trim()).filter(Boolean) || [],
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

      await cleanup() // Clean up the draft after sending
      toast({ title: "Success", description: "Your email has been sent." })
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

  // (The JSX remains almost identical, as the changes were primarily in logic hooks)
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
                  {!showCc && (
                    <>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowCc(true)} className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2">
                        Cc
                      </Button>
                    </>
                  )}
                  {!showBcc && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowBcc(true)} className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2">
                      Bcc
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* CC/BCC Fields */}
            {showCc && (
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCc(false)} className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600">
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

              </>
            )}
            {showBcc && (
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
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowBcc(false)} className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600">
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </div>
            )}

          </div>

          {/* Editor */}
          <div className="flex-1 p-4 overflow-y-auto">
            <RichTextEditor
              ref={editorRef}
              placeholder="Compose your message..."
              // Pass the form's onChange to keep it in sync, but we will primarily
              // use the ref for getting the final content.
              onChange={(content) => form.setValue("content", content, { shouldDirty: true })}
              className="h-full"
              minHeight="200px"
            />
          </div>

          {/* Attachments & Actions */}
          <div className="px-4 pt-2 pb-1 flex-shrink-0 border-t">
            <AttachmentManager
              attachments={uploadedAttachments}
              onRemoveAttachment={handleRemoveAttachment}
              onAttachmentsChange={setUploadedAttachments} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-2 bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={isSending} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-md">
                <span className="font-semibold">Send</span>
                <Send className="h-4 w-4 ml-2" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-600 hover:text-blue-700"
                aria-label="Attach files"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <SignatureSelector selectedSignature={selectedSignature} onSignatureChange={handleSignatureChange} />
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-xs text-gray-500 h-4">
                {isSaving ? "Saving..." : lastSaved && <span>Saved {format(lastSaved, "HH:mm")}</span>}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={handleDeleteDraft} className="text-gray-600 hover:text-red-600" aria-label="Discard draft">
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </form>
      </Form>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
    </div>
  )
}