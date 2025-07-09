"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"

// Tiptap Imports
import { useEditor, EditorContent, EditorContext } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { Underline } from "@tiptap/extension-underline"
import { Link } from "@/components/tiptap/tiptap-extension/link-extension"
import Placeholder from "@tiptap/extension-placeholder"
import { Image as TiptapImage } from "@tiptap/extension-image"

// UI and Icons
import { Button } from "@/components/tiptap/tiptap-ui-primitive/button"
import { Toolbar } from "@/components/tiptap/tiptap-ui-primitive/toolbar"
import { HeadingDropdownMenu } from "@/components/tiptap/tiptap-ui/heading-dropdown-menu"
import { MarkButton } from "@/components/tiptap/tiptap-ui/mark-button"
import { ListDropdownMenu } from "@/components/tiptap/tiptap-ui/list-dropdown-menu"
import { LinkPopover } from "@/components/tiptap/tiptap-ui/link-popover"
import { UndoRedoButton } from "@/components/tiptap/tiptap-ui/undo-redo-button"
import {
  PaperClipIcon,
  TrashIcon,
  PaperAirplaneIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { useToast } from "@/hooks/use-toast"

// Helper function to validate emails
const validateEmails = (emails: string) => {
  if (!emails || emails.trim() === "") return true
  const emailArray = emails.split(",").map((e) => e.trim())
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailArray.every((email) => emailRegex.test(email))
}

// Zod Schema for validation
const emailSchema = z.object({
  to: z.string().min(1, "At least one recipient is required.").refine(validateEmails, "Please enter valid email addresses."),
  cc: z.string().optional().refine(validateEmails, "Please enter valid CC email addresses."),
  bcc: z.string().optional().refine(validateEmails, "Please enter valid BCC email addresses."),
  subject: z.string().min(1, "Subject is required."),
  content: z.string().min(1, "Message body cannot be empty."),
})

interface InlineComposerProps {
  mode: "reply" | "forward"
  originalMessage: any
  onClose: () => void
  onSent: () => void
}

export default function InlineComposer({ mode, originalMessage, onClose, onSent }: InlineComposerProps) {
  const { toast } = useToast()
  const [isMaximized, setIsMaximized] = useState(false)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: {
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      content: "",
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: { HTMLAttributes: { class: "border-l-4 border-gray-300 pl-4" } },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TiptapImage,
      Placeholder.configure({ placeholder: "Type your message here..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose max-w-none focus:outline-none p-4 min-h-[150px]",
      },
    },
    onUpdate: ({ editor }) => {
      form.setValue("content", editor.getHTML(), { shouldValidate: true, shouldDirty: true })
    },
  })

  // Pre-fill form based on mode (reply/forward)
  useEffect(() => {
    if (!originalMessage || !editor) return

    let to = ""
    let subject = ""
    let content = ""

    const originalSender = originalMessage.from
    const formattedDate = format(new Date(originalMessage.created_at), "MMM d, yyyy, h:mm a")
    const quoteHeader = `<p>On ${formattedDate}, ${originalSender} wrote:</p>`
    const originalContent = `<blockquote>${originalMessage.html}</blockquote>`

    if (mode === "reply") {
      to = originalMessage.from
      subject = originalMessage.subject.startsWith("Re:") ? originalMessage.subject : `Re: ${originalMessage.subject}`
      content = `<br><br>${quoteHeader}${originalContent}`
    } else { // forward
      subject = originalMessage.subject.startsWith("Fwd:") ? originalMessage.subject : `Fwd: ${originalMessage.subject}`
      const forwardHeader = `
        <p>---------- Forwarded message ---------</p>
        <p>From: ${originalMessage.from}</p>
        <p>Date: ${formattedDate}</p>
        <p>Subject: ${originalMessage.subject}</p>
        <p>To: ${originalMessage.to.join(", ")}</p>
        ${originalMessage.cc?.length > 0 ? `<p>Cc: ${originalMessage.cc.join(", ")}</p>` : ""}
        <br>
      `
      content = `<br><br>${forwardHeader}${originalContent}`
      // For forwarding, we might want to carry over attachments.
      // This example just prepares them for display, sending logic needs to handle them.
      setUploadedAttachments(originalMessage.attachments || [])
    }

    form.reset({ to, subject, cc: "", bcc: "", content })
    editor.commands.setContent(content)
    editor.commands.focus("end")
  }, [mode, originalMessage, editor, form])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files)])
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (files: File[]) => {
    const uploadedFileIds = []
    const token = localStorage.getItem("accessToken")

    for (const file of files) {
      const formData = new FormData()
      formData.append("file", file)
      try {
        const response = await fetch("/api/attachments", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!response.ok) throw new Error(`Failed to upload ${file.name}`)
        const result = await response.json()
        uploadedFileIds.push(result.attachment._id)
      } catch (error) {
        console.error("Upload error:", error)
        toast({ title: "Attachment Error", description: `Could not upload ${file.name}.`, variant: "destructive" })
        return null // Indicate failure
      }
    }
    return uploadedFileIds
  }

  const onSubmit = async (values: z.infer<typeof emailSchema>) => {
    setIsSending(true)

    let newAttachmentIds: string[] = []
    if (attachments.length > 0) {
      const result = await uploadFiles(attachments)
      if (result === null) {
        setIsSending(false)
        return // Stop submission if an upload failed
      }
      newAttachmentIds = result
    }

    const existingAttachmentIds = mode === "forward" ? uploadedAttachments.map((att) => att._id) : []
    const allAttachmentIds = [...existingAttachmentIds, ...newAttachmentIds]

    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          to: values.to.split(",").map((email) => email.trim()),
          cc: values.cc ? values.cc.split(",").map((email) => email.trim()) : [],
          bcc: values.bcc ? values.bcc.split(",").map((email) => email.trim()) : [],
          subject: values.subject,
          html: values.content,
          text: editor?.getText(), // Tiptap can provide plain text version
          attachments: allAttachmentIds,
          in_reply_to: mode === "reply" ? originalMessage.message_id : undefined,
          references: mode === "reply" ? [...(originalMessage.references || []), originalMessage.message_id] : undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to send email.")

      toast({ title: "Success", description: "Your email has been sent." })
      onSent()
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  if (!editor) return null

  return (
    <div className={`fixed bottom-0 right-4 bg-white shadow-2xl rounded-t-lg border border-gray-300 ${isMaximized ? "w-full h-full right-0 rounded-none" : "w-[600px]"}`}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-gray-100 rounded-t-lg">
          <span className="text-sm font-medium text-gray-700 capitalize">{mode}</span>
          <div className="flex items-center space-x-2">
            <button type="button" onClick={() => setIsMaximized(!isMaximized)} className="p-1 text-gray-500 hover:text-gray-800">
              {isMaximized ? <ArrowsPointingInIcon className="h-4 w-4" /> : <ArrowsPointingOutIcon className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Recipient Fields */}
        <div className="p-3 border-b">
          <div className="flex items-center text-sm">
            <label className="text-gray-500 mr-2">To</label>
            <input {...form.register("to")} className="flex-1 p-1 focus:outline-none" />
            <button type="button" onClick={() => setShowCcBcc(!showCcBcc)} className="text-blue-600 text-xs ml-2 hover:underline">
              Cc/Bcc
            </button>
          </div>
          {form.formState.errors.to && <p className="text-xs text-red-500 mt-1 ml-6">{form.formState.errors.to.message}</p>}

          {showCcBcc && (
            <>
              <div className="flex items-center text-sm border-t mt-2 pt-2">
                <label className="text-gray-500 mr-2">Cc</label>
                <input {...form.register("cc")} className="flex-1 p-1 focus:outline-none" />
              </div>
              {form.formState.errors.cc && <p className="text-xs text-red-500 mt-1 ml-6">{form.formState.errors.cc.message}</p>}
              <div className="flex items-center text-sm border-t mt-2 pt-2">
                <label className="text-gray-500 mr-2">Bcc</label>
                <input {...form.register("bcc")} className="flex-1 p-1 focus:outline-none" />
              </div>
              {form.formState.errors.bcc && <p className="text-xs text-red-500 mt-1 ml-6">{form.formState.errors.bcc.message}</p>}
            </>
          )}

          <div className="flex items-center text-sm border-t mt-2 pt-2">
            <input {...form.register("subject")} className="flex-1 p-1 font-medium focus:outline-none" placeholder="Subject" />
          </div>
          {form.formState.errors.subject && <p className="text-xs text-red-500 mt-1">{form.formState.errors.subject.message}</p>}
        </div>

        {/* Tiptap Editor */}
        <div className="flex-1 overflow-y-auto">
          <EditorContext.Provider value={{ editor }}>
            <Toolbar className="sticky top-0 z-10 bg-white border-b">
              <UndoRedoButton action="undo" />
              <UndoRedoButton action="redo" />
              <HeadingDropdownMenu levels={[1, 2, 3]} />
              <MarkButton type="bold" />
              <MarkButton type="italic" />
              <MarkButton type="underline" />
              <ListDropdownMenu types={["bulletList", "orderedList"]} />
              <LinkPopover />
            </Toolbar>
            <EditorContent editor={editor} />
          </EditorContext.Provider>
        </div>
        
        {/* Attachment List */}
        {(attachments.length > 0 || uploadedAttachments.length > 0) && (
            <div className="px-4 py-2 border-t text-xs">
                {uploadedAttachments.map((att) => (
                    <div key={att._id} className="inline-flex items-center bg-gray-100 rounded-full px-2 py-1 mr-1 mb-1">
                        <span>{att.filename}</span>
                    </div>
                ))}
                {attachments.map((file, index) => (
                    <div key={index} className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-1 mr-1 mb-1">
                        <span>{file.name}</span>
                        <button type="button" onClick={() => handleRemoveAttachment(index)} className="ml-2 text-blue-600 hover:text-blue-900">
                            <XMarkIcon className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-3 border-t">
          <div className="flex items-center space-x-2">
            <Button type="submit" disabled={isSending}>
              {isSending ? "Sending..." : "Send"}
              <PaperAirplaneIcon className="h-4 w-4 ml-2 -mr-1" />
            </Button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <PaperClipIcon className="h-5 w-5" />
            </button>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}