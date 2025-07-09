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
import { EditorContent, EditorContext, useEditor, Extension } from "@tiptap/react"

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
import { Ellipsis, Paperclip, Trash2, X } from "lucide-react"

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

const InlineStyleExtension = Extension.create({
  name: 'inlineStyle',
  addGlobalAttributes() {
    return [ {
        types: ['textStyle'],
        attributes: {
          style: {
            default: null,
            parseHTML: element => element.getAttribute('style'),
            renderHTML: attributes => (attributes.style ? { style: attributes.style } : {}),
          },
        },
      },
    ]
  },
});

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
  const [quotedContent, setQuotedContent] = useState<string | null>(null)
  const [isQuoteVisible, setIsQuoteVisible] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const localStorageKey = useRef<string>(`draft-${replyToMessage?.message_id || forwardMessage?.message_id || initialDraftId || 'new'}`);

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: { to: "", cc: "", bcc: "", subject: "", content: "", attachments: [] },
  });



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
      TiptapImage, Iframe, Typography, Superscript, Subscript, Selection, TrailingNode, Link, InlineStyleExtension
    ],
    content: form.getValues("content"),
    onUpdate: ({ editor }) => {
      // Prevent updating form if editor is not yet initialized with content
      if(!isInitializing) {
        form.setValue("content", editor.getHTML(), { shouldValidate: true, shouldDirty: true });
      }
    }
  });

  
  useEffect(() => {
    if (!editor) return;

    const initialize = async () => {
      setIsInitializing(true);
      const token = localStorage.getItem("accessToken");
      const conversationId = replyToMessage?.message_id || forwardMessage?.message_id;

      let draftToLoadId = initialDraftId;
      let finalContent = '<p></p>';
      let finalAttachments: any[] = [];
      let finalFormValues = { to: "", cc: "", bcc: "", subject: "", content: "" };

      // 1. Check for a draft related to this conversation via API
      if (!draftToLoadId && conversationId) {
        try {
          const res = await fetch(`/api/drafts?in_reply_to_id=${encodeURIComponent(conversationId)}`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            draftToLoadId = data.draft?._id;
          }
        } catch (e) { console.warn("Could not search for existing draft.", e) }
      }

      // 2. Load the draft from API if an ID is found
      if (draftToLoadId) {
        try {
          const res = await fetch(`/api/drafts/${draftToLoadId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error("Draft not found in API");
          const { draft } = await res.json();
          setDraftId(draft._id);
          finalFormValues = {
            to: draft.to?.join(", ") || "",
            cc: draft.cc?.join(", ") || "",
            bcc: draft.bcc?.join(", ") || "",
            subject: draft.subject || "",
            content: draft.html || "<p></p>",
          };
          finalAttachments = draft.attachments || [];
        } catch (error) {
          console.error("Failed to load draft from API.", error);
        }
      }
      
      // 3. If no API draft, set up a new reply/forward state
      else if (replyToMessage) {
        finalFormValues.to = replyToMessage.from;
        finalFormValues.subject = replyToMessage.subject.startsWith("Re:") ? replyToMessage.subject : `Re: ${replyToMessage.subject}`;
        const formattedDate = format(new Date(replyToMessage.created_at), "MMM d, yyyy, h:mm a");
        const header = `<p><br></p><p>On ${formattedDate}, ${replyToMessage.from} wrote:</p>`;
        finalContent = `${header}<blockquote>${replyToMessage.html}</blockquote>`;
      } else if (forwardMessage) {
        finalFormValues.subject = forwardMessage.subject.startsWith("Fwd:") ? forwardMessage.subject : `Fwd: ${forwardMessage.subject}`;
        const formattedDate = format(new Date(forwardMessage.created_at), "MMM d, yyyy, h:mm a");
        const header = `<p><br></p><p>---------- Forwarded message ---------<br>From: ${forwardMessage.from}<br>Date: ${formattedDate}<br>Subject: ${forwardMessage.subject}<br>To: ${forwardMessage.to?.join(", ")}</p>`;
        finalContent = `${header}<blockquote>${forwardMessage.html}</blockquote>`;
        finalAttachments = forwardMessage.attachments || [];
      }
      
      // 4. Populate form and editor
      if (finalFormValues.content === "") {
          finalFormValues.content = finalContent;
      }
      form.reset(finalFormValues);
      setUploadedAttachments(finalAttachments);
      if(finalFormValues.cc || finalFormValues.bcc) setShowCcBcc(true);
      
      editor.commands.setContent(finalFormValues.content);
      editor.commands.focus('start');
      
      setIsInitializing(false);
    };

    initialize();
  }, [editor]); // Run only when editor is ready


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
  const saveDraft = useCallback(async (data: any, attachments: any[]) => {
    const formContent = editor?.getHTML() || data.content;
    if (!data.subject && formContent === '<p></p>' && attachments.length === 0) return;

    const saveData = { ...data, content: formContent };
    localStorage.setItem(localStorageKey.current, JSON.stringify({ values: saveData, attachments }));

    setIsSaving(true);
    const payload = {
      to: data.to.split(",").map((e:string) => e.trim()).filter(Boolean),
      cc: data.cc?.split(",").map((e:string) => e.trim()).filter(Boolean) || [],
      bcc: data.bcc?.split(",").map((e:string) => e.trim()).filter(Boolean) || [],
      subject: data.subject,
      html: formContent,
      attachments: attachments.map(att => att._id),
      in_reply_to_id: replyToMessage?.message_id || forwardMessage?.message_id,
    };

    try {
      const token = localStorage.getItem("accessToken");
      const url = draftId ? `/api/drafts/${draftId}` : "/api/drafts";
      const method = draftId ? "PATCH" : "POST";
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (response.ok) {
        const result = await response.json();
        if (!draftId) setDraftId(result.draft._id);
        setLastSaved(new Date());
      }
    } catch (error) { console.error("Auto-save error:", error); } 
    finally { setIsSaving(false); }
}, [draftId, editor, replyToMessage, forwardMessage]);

  const debouncedSave = useCallback(debounce(saveDraft, 2000), [saveDraft]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (form.formState.isDirty) {
        debouncedSave(value as z.infer<typeof emailSchema>, uploadedAttachments);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, debouncedSave, uploadedAttachments]);


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch("/api/attachments", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
        const result = await response.json();
        setUploadedAttachments(prev => [...prev, result.attachment]);
      } catch (error) { toast({ title: "Attachment Error", description: (error as Error).message, variant: "destructive" }); }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = (attachmentIdToRemove: string) => {
    setUploadedAttachments(prev => prev.filter(att => att._id !== attachmentIdToRemove));
  };

  const cleanup = async () => {
    localStorage.removeItem(localStorageKey.current);
    if (draftId) {
      const token = localStorage.getItem("accessToken");
      await fetch(`/api/drafts/${draftId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    }
  };

  const handleDeleteDraft = async () => {
    await cleanup();
    toast({ title: "Draft Discarded" });
    onClose();
  };


  async function onSubmit(values: z.infer<typeof emailSchema>) {
    setIsSending(true);
    try {

      const finalHtml = isQuoteVisible && quotedContent
        ? `${values.content}<br>${quotedContent}`
        : values.content;


      const token = localStorage.getItem("accessToken");
      const payload = {
        to: values.to.split(",").map(e => e.trim()),
        cc: values.cc?.split(",").map(e => e.trim()).filter(Boolean) || [],
        bcc: values.bcc?.split(",").map(e => e.trim()).filter(Boolean) || [],
        subject: values.subject,
        html: finalHtml,
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
      await cleanup();
      onSent();
      onClose();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  if (isInitializing) { return <div className="p-8 text-center text-muted-foreground">Loading composer...</div> }

  const compactInputStyle = "border-0 border-b rounded-none shadow-none focus-visible:ring-0 focus:border-primary py-1 h-auto text-sm px-1";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full bg-background border rounded-lg shadow-lg">
        {/* --- Header Fields (with new compact style) --- */}
        <div className="p-3 space-y-2 border-b">
          <div className="flex items-center gap-2">
            <FormField control={form.control} name="to" render={({ field }) => (
              <FormItem className="flex-1 flex items-baseline gap-2">
                <FormLabel className="text-xs text-muted-foreground">To</FormLabel>
                <FormControl><Input placeholder="Recipients" {...field} className={compactInputStyle} /></FormControl>
              </FormItem>
            )}
            />
            <Button type="button" onClick={() => setShowCcBcc(!showCcBcc)} className="text-xs text-muted-foreground h-auto p-1">Cc/Bcc</Button>
          </div>
          <FormMessage {...form.getFieldState("to")} className="text-xs ml-8 -mt-1" />

          {showCcBcc && (
            <>
              <FormField control={form.control} name="cc" render={({ field }) => (
                <FormItem className="flex-1 flex items-baseline gap-2">
                  <FormLabel className="text-xs text-muted-foreground">Cc</FormLabel>
                  <FormControl><Input placeholder="Carbon Copy" {...field} className={compactInputStyle} /></FormControl>
                </FormItem>
              )} />
              <FormMessage {...form.getFieldState("cc")} className="text-xs ml-8 -mt-1" />

              <FormField control={form.control} name="bcc" render={({ field }) => (
                <FormItem className="flex-1 flex items-baseline gap-2">
                  <FormLabel className="text-xs text-muted-foreground">Bcc</FormLabel>
                  <FormControl><Input placeholder="Blind Carbon Copy" {...field} className={compactInputStyle} /></FormControl>
                </FormItem>
              )} />
              <FormMessage {...form.getFieldState("bcc")} className="text-xs ml-8 -mt-1" />
            </>
          )}

          <FormField control={form.control} name="subject" render={({ field }) => (
            <FormItem className="flex items-baseline gap-2">
              <FormLabel className="text-xs text-muted-foreground">Subject</FormLabel>
              <FormControl><Input placeholder="Email Subject" {...field} className={`${compactInputStyle} font-medium`} /></FormControl>
            </FormItem>
          )} />
          <FormMessage {...form.getFieldState("subject")} className="text-xs ml-14 -mt-1" />
        </div>


       {/* Toolbar */}
       <div className="flex-shrink-0 border-b"><MainToolbarContent editor={editor!} isMobile={isMobile} /></div>
        
        {/* Editor Content Area */}
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
        
        {/* Attachments List */}
        {uploadedAttachments.length > 0 && (
            <div className="flex-shrink-0 px-4 py-2 border-t">
                <ul className="flex flex-wrap gap-2">
                    {uploadedAttachments.map(att => (
                        <li key={att._id} className="flex items-center text-sm bg-muted text-muted-foreground rounded-full px-3 py-1">
                           <Paperclip className="h-4 w-4 mr-2" />
                           <span>{att.filename}</span>
                           <button type="button" onClick={() => handleRemoveAttachment(att._id)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5"><X className="h-3 w-3" /></button>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 border-t">
          <div className="flex items-center space-x-2">
            <Button type="submit" disabled={isSending || !form.formState.isValid}>
              {isSending ? "Sending..." : "Send"}
              <PaperAirplaneIcon className="h-4 w-4 ml-2" />
            </Button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <Button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach files"><Paperclip className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center space-x-4">
              <span className="text-xs text-muted-foreground">
                  {isSaving ? "Saving..." : lastSaved ? `Saved at ${format(lastSaved, 'h:mm a')}` : ""}
              </span>
              <Button type="button" onClick={handleDeleteDraft} aria-label="Discard draft"><Trash2 className="h-5 w-5 text-muted-foreground" /></Button>
          </div>
        </div>
      </form>
    </Form>
  )
}