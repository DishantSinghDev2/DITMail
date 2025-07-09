"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { debounce } from "lodash"
import { format } from "date-fns"

// --- Tiptap Core and React ---
import { Editor } from '@tiptap/core'
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image as TiptapImage } from "@tiptap/extension-image"
import { TaskItem } from "@tiptap/extension-task-item"
import { TaskList } from "@tiptap/extension-task-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Underline } from "@tiptap/extension-underline"
import Placeholder from '@tiptap/extension-placeholder'
import { Link } from "@/components/tiptap/tiptap-extension/link-extension"
import { Selection } from "@/components/tiptap/tiptap-extension/selection-extension"
import { TrailingNode } from "@/components/tiptap/tiptap-extension/trailing-node-extension"
import Iframe from "@/components/tiptap/tiptap-extension/iframe-extension"

// --- UI Primitives and Shadcn/UI Components ---
import { Button } from "@/components/tiptap/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap/tiptap-ui-primitive/spacer"
import { Toolbar, ToolbarGroup, ToolbarSeparator } from "@/components/tiptap/tiptap-ui-primitive/toolbar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { PaperAirplaneIcon, PaperClipIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline"

// --- Tiptap UI Components (assumed to exist from original code) ---
import { HeadingDropdownMenu } from "@/components/tiptap/tiptap-ui/heading-dropdown-menu"
import { ListDropdownMenu } from "@/components/tiptap/tiptap-ui/list-dropdown-menu"
import { NodeButton } from "@/components/tiptap/tiptap-ui/node-button"
import { HighlightPopover, HighlightContent, HighlighterButton } from "@/components/tiptap/tiptap-ui/highlight-popover"
import { LinkPopover, LinkContent, LinkButton } from "@/components/tiptap/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap/tiptap-ui/undo-redo-button"
import { EmbedButton, EmbedContent, EmbedPopover } from "@/components/tiptap/tiptap-ui/embed-button"
import { ArrowLeftIcon } from "@/components/tiptap/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap/tiptap-icons/link-icon"
import { useIsMobile } from "@/hooks/use-mobile"

// --- Styles ---
import "./simple-editor.scss"
import "@/app/globals.css"

// --- Helper to validate comma-separated emails ---
const validateEmails = (emails: string) => {
  if (!emails || emails.trim() === "") return true // Optional fields are valid if empty
  const emailArray = emails.split(",").map((e) => e.trim()).filter(Boolean)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailArray.every((email) => emailRegex.test(email))
};

// --- Zod Schema for Email Validation ---
const emailSchema = z.object({
  to: z.string().min(1, "At least one recipient is required.").refine(validateEmails, "Please enter valid, comma-separated email addresses."),
  cc: z.string().optional().refine(validateEmails, "Please enter valid, comma-separated CC email addresses."),
  bcc: z.string().optional().refine(validateEmails, "Please enter valid, comma-separated BCC email addresses."),
  subject: z.string().min(1, "Subject is required."),
  content: z.string().min(1, "Message body cannot be empty."),
  attachments: z.array(z.object({ _id: z.string(), filename: z.string(), size: z.number() })).optional(),
})

// --- Component Props Interface ---
interface EmailEditorProps {
  onClose: () => void
  onSent: () => void
  replyToMessage?: any
  forwardMessage?: any
  draftId?: string
}

// --- Toolbar (Largely Unchanged) ---
const MainToolbarContent = ({ editor, isMobile }: { editor: Editor, isMobile: boolean }) => (
  <EditorContext.Provider value={{ editor }}>
    <Spacer />
    <ToolbarGroup><UndoRedoButton action="undo" /><UndoRedoButton action="redo" /></ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup><HeadingDropdownMenu levels={[1, 2, 3, 4]} /><ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} /><NodeButton type="codeBlock" /><NodeButton type="blockquote" /></ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup><MarkButton type="bold" /><MarkButton type="italic" /><MarkButton type="strike" /><MarkButton type="code" /><MarkButton type="underline" />{!isMobile && <HighlightPopover />}{!isMobile && <LinkPopover />}</ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup><MarkButton type="superscript" /><MarkButton type="subscript" /></ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup><TextAlignButton align="left" /><TextAlignButton align="center" /><TextAlignButton align="right" /><TextAlignButton align="justify" /></ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>{!isMobile && <EmbedPopover />}</ToolbarGroup>
    <Spacer />
    {isMobile && <ToolbarSeparator />}
  </EditorContext.Provider>
)

// --- Main Email Editor Component ---
export function EmailEditor({ onClose, onSent, replyToMessage, forwardMessage, draftId: initialDraftId }: EmailEditorProps) {
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draftId, setDraftId] = useState(initialDraftId)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([])
  
  const isMobile = useIsMobile()
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
      attachments: [],
    },
  })

  // --- Initialize form based on props (Reply, Forward, Draft) ---
  useEffect(() => {
    const initialize = async () => {
      // Load from Draft
      if (initialDraftId) {
        try {
          const token = localStorage.getItem("accessToken");
          const response = await fetch(`/api/drafts/${initialDraftId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!response.ok) throw new Error("Failed to load draft");
          const data = await response.json();
          const draft = data.draft;
          form.reset({
            to: draft.to?.join(", ") || "",
            cc: draft.cc?.join(", ") || "",
            bcc: draft.bcc?.join(", ") || "",
            subject: draft.subject || "",
            content: draft.html || "",
          });
          setUploadedAttachments(draft.attachments || []);
          if (draft.cc?.length > 0 || draft.bcc?.length > 0) setShowCcBcc(true);
        } catch (error) {
          console.error("Error loading draft:", error);
          toast({ title: "Error", description: "Could not load draft.", variant: "destructive" });
        }
        return;
      }
      
      let content = "";
      // Handle Reply
      if (replyToMessage) {
        const formattedDate = format(new Date(replyToMessage.created_at), "MMM d, yyyy, h:mm a");
        const quoteHeader = `<p><br>--- On ${formattedDate}, ${replyToMessage.from} wrote: ---</p>`;
        const originalContent = `<blockquote>${replyToMessage.html}</blockquote>`;
        content = `${quoteHeader}${originalContent}`;
        form.reset({
          to: replyToMessage.from,
          subject: replyToMessage.subject.startsWith("Re:") ? replyToMessage.subject : `Re: ${replyToMessage.subject}`,
          content: content,
        });
      }
      
      // Handle Forward
      if (forwardMessage) {
        const formattedDate = format(new Date(forwardMessage.created_at), "MMM d, yyyy, h:mm a");
        const forwardHeader = `
          <p><br>---------- Forwarded message ---------</p>
          <p>From: ${forwardMessage.from}</p>
          <p>Date: ${formattedDate}</p>
          <p>Subject: ${forwardMessage.subject}</p>
          <p>To: ${forwardMessage.to?.join(", ")}</p>
          ${forwardMessage.cc?.length > 0 ? `<p>Cc: ${forwardMessage.cc.join(", ")}</p>` : ""}
        `;
        const originalContent = `<blockquote>${forwardMessage.html}</blockquote>`;
        content = `${forwardHeader}${originalContent}`;
        form.reset({
          subject: forwardMessage.subject.startsWith("Fwd:") ? forwardMessage.subject : `Fwd: ${forwardMessage.subject}`,
          content: content,
        });
        setUploadedAttachments(forwardMessage.attachments || []);
      }
    };
    initialize();
  }, [replyToMessage, forwardMessage, initialDraftId, form, toast]);
  

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none p-4 min-h-[250px]",
        "aria-label": "Email content area",
      },
    },
    extensions: [
      StarterKit, Placeholder.configure({ placeholder: 'Compose your epic email...' }),
      TextAlign.configure({ types: ["heading", "paragraph"] }), Underline, TaskList, TaskItem, Highlight,
      TiptapImage, Iframe, Typography, Superscript, Subscript, Selection, TrailingNode, Link,
    ],
    content: form.getValues("content"),
    onUpdate: ({ editor }) => {
      form.setValue("content", editor.getHTML(), { shouldValidate: true, shouldDirty: true });
    },
  });

  // --- Set editor content when form values are reset ---
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "content" && editor && !editor.isDestroyed) {
        if (editor.getHTML() !== value.content) {
            editor.commands.setContent(value.content || '', false);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, editor]);

  // --- Auto-save Drafts ---
  const saveDraft = useCallback(async (data: z.infer<typeof emailSchema>) => {
    if (!data.subject && !data.content) return; // Don't save empty drafts
    setIsSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const url = draftId ? `/api/drafts/${draftId}` : "/api/drafts";
      const method = draftId ? "PATCH" : "POST";
      
      const payload = {
          to: data.to.split(",").map(e => e.trim()).filter(Boolean),
          cc: data.cc?.split(",").map(e => e.trim()).filter(Boolean) || [],
          bcc: data.bcc?.split(",").map(e => e.trim()).filter(Boolean) || [],
          subject: data.subject,
          html: data.content,
          attachments: uploadedAttachments.map(att => att._id)
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        if (!draftId) setDraftId(result.draft._id);
        setLastSaved(new Date());
      } else {
        throw new Error("Failed to save draft");
      }
    } catch (error) {
      console.error("Auto-save error:", error);
      // Optional: show a non-intrusive toast
    } finally {
      setIsSaving(false);
    }
  }, [draftId, uploadedAttachments]);

  const debouncedSave = useCallback(debounce(saveDraft, 2500), [saveDraft]);

  useEffect(() => {
    const subscription = form.watch((value) => {
        if (form.formState.isDirty) {
           debouncedSave(value as z.infer<typeof emailSchema>);
        }
    });
    return () => subscription.unsubscribe();
  }, [form, debouncedSave]);


  // --- File Handling ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const token = localStorage.getItem("accessToken");

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetch("/api/attachments", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
        const result = await response.json();
        setUploadedAttachments(prev => [...prev, result.attachment]);
      } catch (error) {
        console.error("Upload error:", error);
        toast({ title: "Attachment Error", description: (error as Error).message, variant: "destructive" });
      }
    }
     // Clear file input value to allow re-selecting the same file
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleRemoveAttachment = async (attachmentIdToRemove: string) => {
      try {
          const token = localStorage.getItem("accessToken");
          await fetch(`/api/attachments/${attachmentIdToRemove}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
          });
          setUploadedAttachments(prev => prev.filter(att => att._id !== attachmentIdToRemove));
      } catch (error) {
          console.error("Error deleting attachment:", error);
          toast({ title: "Error", description: "Could not remove attachment.", variant: "destructive" });
      }
  };
  
  // --- Form Actions ---
  const handleDeleteDraft = async () => {
    if (draftId) {
      try {
        const token = localStorage.getItem("accessToken");
        await fetch(`/api/drafts/${draftId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        toast({ title: "Draft Discarded" });
      } catch (error) {
        console.error("Error discarding draft:", error);
        // Fail silently, as user intent is just to close.
      }
    }
    onClose();
  };

  async function onSubmit(values: z.infer<typeof emailSchema>) {
    setIsSending(true);
    try {
      const token = localStorage.getItem("accessToken");
      const payload = {
        to: values.to.split(",").map(e => e.trim()),
        cc: values.cc?.split(",").map(e => e.trim()).filter(Boolean) || [],
        bcc: values.bcc?.split(",").map(e => e.trim()).filter(Boolean) || [],
        subject: values.subject,
        html: values.content,
        attachments: uploadedAttachments.map(att => att._id),
        ...(replyToMessage && {
          in_reply_to: replyToMessage.message_id,
          references: [...(replyToMessage.references || []), replyToMessage.message_id],
        }),
      };
      
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to send email.");
      
      if (draftId) { // Delete draft after successful send
          await fetch(`/api/drafts/${draftId}`, {
             method: "DELETE", headers: { Authorization: `Bearer ${token}` }
          });
      }

      toast({ title: "Success", description: "Your email has been sent." });
      onSent();
      onClose();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  if (!editor) {
    return <div className="p-4 text-center">Loading composer...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full bg-background border rounded-lg shadow-lg">
        {/* --- Header Fields --- */}
        <div className="p-4 space-y-3 border-b">
          <div className="flex items-center">
            <FormField control={form.control} name="to" render={({ field }) => (
                <FormItem className="flex-1">
                  <div className="flex items-center">
                    <FormLabel className="w-12 text-sm text-muted-foreground">To</FormLabel>
                    <FormControl><Input placeholder="Recipients" {...field} className="border-0 shadow-none focus-visible:ring-0" /></FormControl>
                  </div>
                   <FormMessage className="ml-12" />
                </FormItem>
              )}
            />
            <Button type="button" variant="link" size="sm" onClick={() => setShowCcBcc(!showCcBcc)} className="text-muted-foreground">Cc/Bcc</Button>
          </div>
          
          {showCcBcc && (
            <>
            <Separator />
            <FormField control={form.control} name="cc" render={({ field }) => (
                <FormItem className="flex items-center">
                  <FormLabel className="w-12 text-sm text-muted-foreground">Cc</FormLabel>
                  <FormControl><Input placeholder="Carbon Copy" {...field} className="border-0 shadow-none focus-visible:ring-0" /></FormControl>
                  <FormMessage className="ml-2" />
                </FormItem>
            )}/>
            <Separator />
            <FormField control={form.control} name="bcc" render={({ field }) => (
                <FormItem className="flex items-center">
                  <FormLabel className="w-12 text-sm text-muted-foreground">Bcc</FormLabel>
                  <FormControl><Input placeholder="Blind Carbon Copy" {...field} className="border-0 shadow-none focus-visible:ring-0" /></FormControl>
                   <FormMessage className="ml-2" />
                </FormItem>
            )}/>
            </>
          )}

          <Separator />
          
          <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem className="flex items-center">
                <FormLabel className="w-12 text-sm text-muted-foreground">Subject</FormLabel>
                <FormControl><Input placeholder="Email Subject" {...field} className="border-0 shadow-none focus-visible:ring-0 font-medium" /></FormControl>
                <FormMessage className="ml-2" />
              </FormItem>
          )}/>
        </div>

        {/* --- Tiptap Editor and Toolbar --- */}
        <Toolbar className="sticky top-0 z-10 custom-toolbar-scroll border-b bg-background/80 backdrop-blur-sm">
          <MainToolbarContent editor={editor} isMobile={isMobile} />
        </Toolbar>
        
        <div className="flex-1 overflow-y-auto content-wrapper">
          <EditorContent editor={editor} />
        </div>
        
        {/* --- Attachments List --- */}
        {uploadedAttachments.length > 0 && (
            <div className="px-4 py-2 border-t">
                <ul className="flex flex-wrap gap-2">
                    {uploadedAttachments.map(att => (
                        <li key={att._id} className="flex items-center text-sm bg-muted text-muted-foreground rounded-full px-3 py-1">
                           <PaperClipIcon className="h-4 w-4 mr-2" />
                           <span>{att.filename}</span>
                           <button type="button" onClick={() => handleRemoveAttachment(att._id)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5">
                               <XMarkIcon className="h-3 w-3" />
                           </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {/* --- Footer and Actions --- */}
        <div className="flex items-center justify-between p-3 border-t">
          <div className="flex items-center space-x-2">
            <Button type="submit" disabled={isSending || !form.formState.isValid || !form.formState.isDirty}>
              {isSending ? "Sending..." : "Send"}
              <PaperAirplaneIcon className="h-4 w-4 ml-2" />
            </Button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} aria-label="Attach files">
              <PaperClipIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-4">
              <span className="text-xs text-muted-foreground">
                  {isSaving ? "Saving..." : lastSaved ? `Saved at ${format(lastSaved, 'h:mm a')}` : ""}
              </span>
              <Button type="button" variant="ghost" size="icon" onClick={handleDeleteDraft} aria-label="Discard draft">
                <TrashIcon className="h-5 w-5 text-muted-foreground" />
              </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}