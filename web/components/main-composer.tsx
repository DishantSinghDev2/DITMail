"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { format } from "date-fns"

// UI Components
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

// Custom Components & Hooks
import RichTextEditor, { type RichTextEditorRef } from "./editor/rich-text-editor"
import AttachmentManager from "./editor/attachment-manager"
import ContactAutocomplete from "./editor/contact-autocomplete" // Assuming this component exists
import SignatureSelector from "./editor/signature-selector" // Assuming this component exists
import { useToast } from "@/hooks/use-toast"
import { emailSchema } from "@/lib/schemas" // Assuming this schema exists
import { debounce } from "@/lib/utils"

// Icons
import { X, Minimize2, Send, MoreHorizontal, Paperclip, Trash2, Edit3, ChevronUp, Minus, Maximize2 } from "lucide-react"

// --- Interfaces ---
interface MainComposerProps {
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onSent: () => void
  isMinimized?: boolean
  initialDraftId?: string
  replyToMessage?: any
  forwardMessage?: any
}

interface Attachment {
  _id: string
  name: string
  size: number
  type: string
  url?: string
  isUploading?: boolean
}

// --- Helper Function to get Initial Form Values ---
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
      attachments: forwardMessage.attachments || [],
    }
  }
  return { to: "", cc: "", bcc: "", subject: "", content: "", attachments: [] }
}


export default function MainComposer({
  isOpen,
  onClose,
  onMinimize,
  onMaximize,
  onSent,
  isMinimized = false,
  initialDraftId,
  replyToMessage,
  forwardMessage,
}: MainComposerProps) {
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draftId, setDraftId] = useState(initialDraftId)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [signatureHtml, setSignatureHtml] = useState("")
  const [isEditingSubject, setIsEditingSubject] = useState(!!forwardMessage || !replyToMessage)

  const editorRef = useRef<RichTextEditorRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formInitialized = useRef(false)

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: getInitialFormValues(replyToMessage, forwardMessage),
  })

  // --- Effect for Asynchronous Data Loading ---
  useEffect(() => {
    const loadDraft = async () => {
      if (!initialDraftId) return
      try {
        const token = localStorage.getItem("accessToken")
        const res = await fetch(`/api/drafts/${initialDraftId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error("Failed to load draft")
        const { draft } = await res.json()

        form.reset({
          to: draft.to?.join(", ") || "",
          cc: draft.cc?.join(", ") || "",
          bcc: draft.bcc?.join(", ") || "",
          subject: draft.subject || "",
          content: draft.html || "<p></p>",
        })

        setDraftId(draft._id)
        setAttachments(draft.attachments || [])
        if (draft.cc?.length) setShowCc(true)
        if (draft.bcc?.length) setShowBcc(true)
      } catch (error) {
        console.error("Failed to load draft:", error)
        toast({ title: "Error", description: "Could not load the draft.", variant: "destructive" })
      }
    }

    const setupInitialContent = () => {
      let content = "<p><br></p>"
      let initialAttachments: Attachment[] = []

      const createQuotedBlock = (message: any, type: 'reply' | 'forward') => {
        const formattedDate = format(new Date(message.created_at), "MMM d, yyyy, h:mm a")
        let header = type === 'reply'
          ? `<p>On ${formattedDate}, ${message.from} wrote:</p>`
          : `<p>---------- Forwarded message ---------<br>From: ${message.from}<br>Date: ${formattedDate}<br>Subject: ${message.subject}<br>To: ${message.to?.join(", ")}</p>`
        return `<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${message.html}</blockquote>`
      }

      if (replyToMessage) {
        content += createQuotedBlock(replyToMessage, 'reply')
      } else if (forwardMessage) {
        content += createQuotedBlock(forwardMessage, 'forward')
        initialAttachments = forwardMessage.attachments || []
        setAttachments(initialAttachments)
      }

      form.setValue("content", content, { shouldDirty: false })
    }

    if (initialDraftId) {
      loadDraft()
    } else {
      setupInitialContent()
    }

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.setContent(form.getValues("content"))
        editorRef.current.focus()
        formInitialized.current = true;
      }
    }, 100)
  }, [initialDraftId, replyToMessage, forwardMessage, form, toast])

  // --- Auto-Save Logic ---
  const saveDraft = useCallback(async (data: any, currentAttachments: Attachment[]) => {
    const content = editorRef.current?.getContent() || data.content
    if (!data.subject && (content === "<p></p>" || !content) && currentAttachments.length === 0) {
      return
    }

    setIsSaving(true)
    const payload = {
      to: data.to.split(",").map((e: string) => e.trim()).filter(Boolean),
      cc: data.cc?.split(",").map((e: string) => e.trim()).filter(Boolean) || [],
      bcc: data.bcc?.split(",").map((e: string) => e.trim()).filter(Boolean) || [],
      subject: data.subject,
      html: content,
      attachments: currentAttachments.map((att) => att._id),
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
  }, [draftId, replyToMessage, forwardMessage])

  const debouncedSave = useCallback(debounce(saveDraft, 2000), [saveDraft])

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (formInitialized.current && form.formState.isDirty) {
        debouncedSave(value, attachments)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, debouncedSave, attachments])


  // --- Event Handlers ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const tempAttachments = files.map(file => ({
      _id: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      isUploading: true,
    }))
    setAttachments(prev => [...prev, ...tempAttachments])

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tempId = tempAttachments[i]._id;
        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch("/api/attachments", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
            const result = await response.json();
            setAttachments(prev => prev.map(att => (att._id === tempId ? result.attachment : att)));
        } catch (error) {
            setAttachments(prev => prev.filter(att => att._id !== tempId));
            toast({ title: "Attachment Error", description: (error as Error).message, variant: "destructive" });
        }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a._id !== id));
  }

  const cleanupDraft = async () => {
    if (draftId) {
      try {
        const token = localStorage.getItem("accessToken");
        await fetch(`/api/drafts/${draftId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      } catch (error) {
        console.error("Failed to delete draft on send/close.", error);
      }
    }
  };

  const handleDeleteDraft = async () => {
    await cleanupDraft();
    toast({ title: "Draft Discarded" });
    onClose();
  };

  const onSubmit = async (values: z.infer<typeof emailSchema>) => {
    setIsSending(true)
    try {
      let finalHtml = editorRef.current?.getContent() || values.content;
      if (signatureHtml) {
          const contentParts = finalHtml.split(/<blockquote.*?>/);
          const userContent = contentParts[0] || '<p></p>';
          const quotedBlock = contentParts.length > 1 ? `<blockquote${finalHtml.substring(finalHtml.indexOf('<blockquote') + 11)}` : '';
          finalHtml = `${userContent.trim()}<br>--<br>${signatureHtml}<br>${quotedBlock}`;
      }

      const token = localStorage.getItem("accessToken")
      const payload = {
        to: values.to.split(",").map(e => e.trim()),
        cc: values.cc?.split(",").map(e => e.trim()).filter(Boolean) || [],
        bcc: values.bcc?.split(",").map(e => e.trim()).filter(Boolean) || [],
        subject: values.subject,
        html: finalHtml,
        attachments: attachments.map(att => att._id),
        ...(replyToMessage && { in_reply_to: replyToMessage.message_id }),
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to send email.")

      await cleanupDraft()
      toast({ title: "Success", description: "Your email has been sent." })
      onSent()
      onClose()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  // --- Render Logic ---
  if (!isOpen) return null

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-20 w-80 z-50">
        <Card className="rounded-t-lg rounded-b-none shadow-2xl">
            <div className="flex items-center justify-between p-2 bg-gray-100 border-b cursor-pointer" onClick={onMaximize}>
              <span className="text-sm font-medium truncate">{form.getValues("subject") || "New Message"}</span>
              <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onMaximize(); }} className="h-6 w-6 p-0">
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClose(); }} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
              </div>
            </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl flex flex-col rounded-t-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-100 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-medium">
              {replyToMessage ? "Reply" : forwardMessage ? "Forward" : "New Message"}
            </h2>
            {replyToMessage && !isEditingSubject && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingSubject(true)} className="h-7 px-2 text-xs">
                <Edit3 className="h-3 w-3 mr-1" />
                Edit Subject
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-7 w-7 p-0">
              <Minus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            {/* Email Fields */}
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center">
                <label className="w-12 text-sm text-gray-600">To</label>
                <div className="flex-1 flex items-center">
                    <FormField
                      control={form.control}
                      name="to"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <ContactAutocomplete value={field.value} onChange={field.onChange} placeholder="Recipients" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center ml-2 space-x-1">
                        {!showCc && <Button type="button" variant="link" size="sm" onClick={() => setShowCc(true)} className="text-xs h-6 px-1">Cc</Button>}
                        {!showBcc && <Button type="button" variant="link" size="sm" onClick={() => setShowBcc(true)} className="text-xs h-6 px-1">Bcc</Button>}
                    </div>
                </div>
              </div>
              {showCc && (
                <div className="flex items-center">
                  <label className="w-12 text-sm text-gray-600">Cc</label>
                  <FormField control={form.control} name="cc" render={({ field }) => ( <FormItem className="flex-1"><FormControl><ContactAutocomplete value={field.value || ""} onChange={field.onChange} placeholder="Cc recipients" /></FormControl></FormItem> )} />
                   <Button type="button" variant="ghost" size="sm" onClick={() => setShowCc(false)} className="ml-2 h-6 w-6 p-0 text-gray-400"><X className="h-3 w-3" /></Button>
                </div>
              )}
               {showBcc && (
                <div className="flex items-center">
                  <label className="w-12 text-sm text-gray-600">Bcc</label>
                  <FormField control={form.control} name="bcc" render={({ field }) => ( <FormItem className="flex-1"><FormControl><ContactAutocomplete value={field.value || ""} onChange={field.onChange} placeholder="Bcc recipients" /></FormControl></FormItem> )} />
                   <Button type="button" variant="ghost" size="sm" onClick={() => setShowBcc(false)} className="ml-2 h-6 w-6 p-0 text-gray-400"><X className="h-3 w-3" /></Button>
                </div>
              )}
              {isEditingSubject && (
                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem className="flex items-center">
                      <label className="w-12 text-sm text-gray-600">Subject</label>
                      <FormControl>
                        <Input {...field} placeholder="Subject" className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500 px-0"/>
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Editor */}
            <div className="flex-1 p-2 overflow-y-auto">
              <RichTextEditor
                ref={editorRef}
                onChange={(content) => form.setValue("content", content, { shouldDirty: true })}
                initialContent={form.getValues("content")}
                className="h-full"
                minHeight="200px"
              />
            </div>

            {/* Attachments */}
            <div className="px-4 pb-2">
              <AttachmentManager onAttachmentsChange={setAttachments} attachments={attachments} onRemoveAttachment={handleRemoveAttachment} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 border-t bg-gray-50">
              <div className="flex items-center space-x-2">
                <Button type="submit" disabled={isSending} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  <span className="font-semibold">Send</span>
                  <Send className="h-4 w-4 ml-2" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Attach files">
                    <Paperclip className="h-5 w-5" />
                </Button>
                <SignatureSelector selectedSignature={selectedSignature} onSignatureChange={(id, html) => { setSelectedSignature(id); setSignatureHtml(html); }} />
              </div>
              <div className="flex items-center space-x-3">
                 <div className="text-xs text-gray-500 h-4">
                    {isSaving ? "Saving..." : lastSaved && <span>Saved at {format(lastSaved, "HH:mm")}</span>}
                 </div>
                 <Button type="button" variant="ghost" size="icon" onClick={handleDeleteDraft} className="text-gray-600 hover:text-red-600" aria-label="Discard draft">
                    <Trash2 className="h-5 w-5" />
                 </Button>
              </div>
            </div>
          </form>
        </Form>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </Card>
    </div>
  )
}