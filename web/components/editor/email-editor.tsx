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
import { Send, Paperclip, ChevronUp, Trash2, Minimize2, Maximize2, X, MoreHorizontal, ArrowUpRightFromSquare } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


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
  const [isQuotedContentExpanded, setIsQuotedContentExpanded] = useState(!!forwardMessage);
  const [isToFieldVisible, setIsToFieldVisible] = useState(!!forwardMessage);

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<RichTextEditorRef>(null)
  const toInputRef = useRef<HTMLInputElement>(null);
  const formInitialized = useRef(false)

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: getInitialFormValues(replyToMessage, forwardMessage),
  })

  useEffect(() => {
    if (forwardMessage && toInputRef.current) {
        toInputRef.current.focus();
    }
  }, [forwardMessage]);

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("accessToken")
      const conversationId = replyToMessage?.message_id || forwardMessage?.message_id
      let draftToLoadId = initialDraftId
      let loadedFromApi = false

      if (!draftToLoadId && conversationId) {
        try {
          const localDrafts = JSON.parse(localStorage.getItem(`draft-${conversationId}`) || "[]")
          if (localDrafts.length > 0) {
            draftToLoadId = localDrafts[0]._id
          }
        } catch (e) {
          console.warn("Could not search for existing draft.", e)
        }
      }

      if (draftToLoadId) {
        try {
          const res = await fetch(`/api/drafts/${draftToLoadId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) throw new Error("Draft not found in API")
          const { draft } = await res.json()

          form.reset({
            to: draft.to?.join(", ") || "",
            cc: draft.cc?.join(", ") || "",
            bcc: draft.bcc?.join(", ") || "",
            subject: draft.subject || "",
            content: draft.html || "<p></p>",
          })

          setDraftId(draft._id)
          setUploadedAttachments(draft.attachments || [])
          if (draft.cc?.length) setShowCc(true)
          if (draft.bcc?.length) setShowBcc(true)
          loadedFromApi = true
        } catch (error) {
          console.error("Failed to load draft from API, proceeding with standard reply/forward.", error)
        }
      }

      if (!loadedFromApi) {
        let content = "<p><br></p>";
        let attachments: Attachment[] = []

        const createQuotedBlock = (message: any, type: 'reply' | 'forward') => {
            const formattedDate = format(new Date(message.created_at), "MMM d, yyyy, h:mm a")
            let header = ''
            if (type === 'reply') {
                header = `<p>On ${formattedDate}, ${message.from} wrote:</p>`
            } else {
                header = `<p>---------- Forwarded message ---------<br>From: ${message.from}<br>Date: ${formattedDate}<br>Subject: ${message.subject}<br>To: ${message.to?.join(", ")}</p>`
            }
            return `<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${message.html}</blockquote>`
        }

        if (replyToMessage) {
            const quotedContent = createQuotedBlock(replyToMessage, 'reply');
            content += `<div class="quoted-content-wrapper">${quotedContent}</div>`;
        } else if (forwardMessage) {
            content += createQuotedBlock(forwardMessage, 'forward')
            attachments = forwardMessage.attachments || []
            setUploadedAttachments(attachments)
        }
        
        form.setValue("content", content, { shouldDirty: false })
      }

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.setContent(form.getValues("content"))
          editorRef.current.focus()
          formInitialized.current = true;
        }
      }, 50)
    }

    loadData()
  }, [initialDraftId, replyToMessage, forwardMessage, form])

  const saveDraft = useCallback(
    async (data: any, attachments: Attachment[]) => {
      const formContent = editorRef.current?.getContent() || data.content
      if (!data.subject && (formContent === "<p></p>" || !formContent) && attachments.length === 0) return

      setIsSaving(true)
      const payload = {
        type: replyToMessage ? "r" : forwardMessage ? "f" : "d",
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
          try {
            const existingDrafts = JSON.parse(localStorage.getItem(`draft-${replyToMessage?.message_id || forwardMessage?.message_id}`) || "[]")
            const updatedDrafts = existingDrafts.filter((d: any) => d._id !== draftId)
            updatedDrafts.push({ ...payload, _id: result.draft._id })
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
      if (formInitialized.current && form.formState.isDirty) {
        debouncedSave(value as z.infer<typeof emailSchema>, uploadedAttachments)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, debouncedSave, uploadedAttachments])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      formData.append("message_id", draftId || "new")
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
      let finalHtml = editorRef.current?.getContent() || values.content;

      if (signatureHtml) {
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

      await cleanup()
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

  const renderRecipientPills = (field: any) => {
    const emails = field.value ? field.value.split(',').map((e: string) => e.trim()).filter(Boolean) : [];
    
    const removeEmail = (emailToRemove: string) => {
        const newEmails = emails.filter((email: string) => email !== emailToRemove);
        field.onChange(newEmails.join(', '));
    }

    return (
      <div className="flex flex-wrap items-center gap-1">
        {emails.map((email: string) => (
          <div key={email} className="flex items-center gap-1 bg-gray-200 rounded-full px-2 py-1 text-sm">
             <Avatar className="h-5 w-5">
                <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{email}</span>
            <button type="button" onClick={() => removeEmail(email)} className="text-gray-500 hover:text-gray-800">
                <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    );
  };
  
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
      {replyToMessage && (
         <div className="flex items-center justify-end p-2 bg-gray-100 border-b">
            <Button variant="ghost" size="sm" title="Pop out reply" onClick={onMinimize} className="h-6 w-auto p-1">
                <ArrowUpRightFromSquare className="h-3 w-3 mr-1" />
            </Button>
        </div>
      )}

      {showWindowControls && !replyToMessage && (
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
          <div className="p-4 border-b space-y-3 flex-shrink-0">
             <div className="flex items-center">
                <label className="w-12 text-sm text-gray-600 flex-shrink-0">To</label>
                <div className="flex-1 flex items-center">
                {!isToFieldVisible && replyToMessage ? (
                    <button type="button" onClick={() => setIsToFieldVisible(true)} className="flex items-center gap-2 text-sm text-gray-800">
                         <Avatar className="h-6 w-6">
                            <AvatarFallback>{replyToMessage.from.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{replyToMessage.from}</span>
                    </button>
                ) : (
                    <FormField
                    control={form.control}
                    name="to"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                        <FormControl>
                            <div className="flex flex-col">
                                {renderRecipientPills(field)}
                                <ContactAutocomplete
                                    ref={toInputRef}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Recipients"
                                    className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
                                />
                            </div>
                        </FormControl>
                        </FormItem>
                    )}
                    />
                )}
                 {(isToFieldVisible || forwardMessage) && (
                    <div className="flex items-center ml-2 space-x-1">
                    {!showCc && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowCc(true)} className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2">
                            Cc
                        </Button>
                    )}
                    {!showBcc && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowBcc(true)} className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2">
                            Bcc
                        </Button>
                    )}
                    </div>
                 )}
                </div>
            </div>

            {showCc && (
              <div className="flex items-center">
                <label className="w-12 text-sm text-gray-600 flex-shrink-0">Cc</label>
                <FormField
                  control={form.control}
                  name="cc"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                         <div className="flex flex-col">
                            {renderRecipientPills(field)}
                            <ContactAutocomplete
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Carbon copy recipients"
                                className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
                            />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
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
                        <div className="flex flex-col">
                            {renderRecipientPills(field)}
                            <ContactAutocomplete
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Blind carbon copy recipients"
                            className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
                            />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
             <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                    <FormItem className="flex items-center">
                         <label className="w-12 text-sm text-gray-600 flex-shrink-0">Subject</label>
                        <FormControl>
                            <Input {...field} placeholder="Subject" className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500" />
                        </FormControl>
                    </FormItem>
                )}
            />
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <RichTextEditor
              ref={editorRef}
              placeholder="Compose your message..."
              onChange={(content) => form.setValue("content", content, { shouldDirty: true })}
              className="h-full"
              minHeight="200px"
            />
            {replyToMessage && (
                <div className="mt-4">
                    {!isQuotedContentExpanded ? (
                        <button type="button" onClick={() => setIsQuotedContentExpanded(true)} className="flex items-center text-gray-500 hover:text-gray-800">
                           <MoreHorizontal className="h-5 w-5" />
                        </button>
                    ) : null}
                </div>
            )}
          </div>

          <div className="px-4 pt-2 pb-1 flex-shrink-0 border-t">
            <AttachmentManager
              attachments={uploadedAttachments}
              onRemoveAttachment={handleRemoveAttachment}
              onAttachmentsChange={setUploadedAttachments} />
          </div>

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
                {isSending && "Sending..."}
                {isSaving && !isSending && "Saving..."}
                {lastSaved && !isSaving && !isSending && <span>Saved {format(lastSaved, "HH:mm")}</span>}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={handleDeleteDraft} className="text-gray-600 hover:text-red-600" aria-label="Discard draft">
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </form>
      </Form>
      <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
    </div>
  )
}