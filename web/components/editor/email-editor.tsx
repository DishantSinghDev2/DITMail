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
import SignatureSelector from "./signature-selector"
// Updated imports to include MoreHorizontal for the expand icon
import { Send, Paperclip, Trash2, Minimize2, Maximize2, X, MoreHorizontal, ArrowUpRightFromSquare, Edit3, ChevronUp, Minus, Baseline } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import ContactAutocomplete from "./contact-autocomplete"
import { send } from "process"

// (Interfaces remain the same)
interface EmailEditorProps {
  onClose: () => void;
  onSent: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  replyToMessage?: any;
  forwardMessage?: any;
  draftId?: string; // <-- This prop is now the source of truth
  isMinimized?: boolean;
  initialData?: z.infer<typeof emailSchema> | null;
  initialAttachments?: Attachment[];
  onDataChange?: (data: z.infer<typeof emailSchema>, attachments: Attachment[]) => void;
  onDraftCreated?: (newDraftId: string) => void; // This now acts as `setDraftId`
}


export interface Attachment {
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
  draftId,
  replyToMessage,
  forwardMessage,
  isMinimized = false,
  initialData = null,
  initialAttachments = [],
  onDataChange,
  onDraftCreated
}: EmailEditorProps) {
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>(initialAttachments)
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [signatureHtml, setSignatureHtml] = useState("")
  const [isToolbarVisible, setIsToolbarVisible] = useState(true)
  const [isEditingSubject, setIsEditingSubject] = useState(!!forwardMessage || !replyToMessage)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<RichTextEditorRef>(null)
  const formInitialized = useRef(false)

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: initialData || {
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      content: "",
      attachments: [],
    },
  });

  // --- DATA LOADING & INITIALIZATION useEffect ---
  useEffect(() => {
    const loadData = async () => {
      let dataToSet: z.infer<typeof emailSchema> | null = null;
      let attachmentsToSet: Attachment[] = [];

      if (initialData) {
        console.log("Hydrating composer from initialData prop...");
        dataToSet = initialData;
        attachmentsToSet = initialAttachments;
      } else if (draftId) {
        console.log(`Fetching draft ${draftId} from API...`);
        try {
          const res = await fetch(`/api/drafts/${draftId}`);
          if (!res.ok) throw new Error("Draft not found in API");
          const { draft } = await res.json();
          dataToSet = {
            to: draft.to?.join(", ") || "",
            cc: draft.cc?.join(", ") || "",
            bcc: draft.bcc?.join(", ") || "",
            subject: draft.subject || "",
            content: draft.html || "<p></p>",
            attachments: draft.attachments?.map((a: any) => a._id) || []
          };
          attachmentsToSet = draft.attachments || [];
        } catch (error) {
          console.error("Failed to load draft from API:", error);
          toast({ title: "Error", description: "Could not load the requested draft.", variant: "destructive" });
          onClose();
          return;
        }
      } else {
        console.log("Setting up a new composition...");
        let content = "<p><br></p>";
        let subject = "";
        let to = "";

        if (replyToMessage) {
          to = replyToMessage.from;
          subject = `Re: ${replyToMessage.subject}`;
          const formattedDate = format(new Date(replyToMessage.created_at), "MMM d, yyyy, h:mm a");
          const header = `<p>On ${formattedDate}, ${replyToMessage.from} wrote:</p>`;
          content += `<br>${header}<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${replyToMessage.html}</blockquote>`;
          setIsEditingSubject(false);
        } else if (forwardMessage) {
          subject = `Fwd: ${forwardMessage.subject}`;
          const formattedDate = format(new Date(forwardMessage.created_at), "MMM d, yyyy, h:mm a");
          const header = `<p>---------- Forwarded message ---------<br>From: ${forwardMessage.from}<br>Date: ${formattedDate}<br>Subject: ${forwardMessage.subject}<br>To: ${forwardMessage.to?.join(", ")}</p><br>`;
          content += `<br>${header}<blockquote style="margin: 0 0 0 0.8ex; border-left: 1px #ccc solid; padding-left: 1ex;">${forwardMessage.html}</blockquote>`;
          attachmentsToSet = forwardMessage.attachments || [];
          setIsEditingSubject(true);
        } else {
          setIsEditingSubject(true);
        }

        dataToSet = { content, subject, to, cc: "", bcc: "", attachments: [] };
      }

      if (dataToSet) {
        form.reset(dataToSet);
        if (dataToSet.cc) setShowCc(true);
        if (dataToSet.bcc) setShowBcc(true);
        setUploadedAttachments(attachmentsToSet);

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.setContent(dataToSet!.content);
            editorRef.current.focus();
            // Mark form as initialized only after everything is loaded
            formInitialized.current = true;
          }
        }, 100);
      }
    };

    loadData();
  }, [draftId, initialData, replyToMessage, forwardMessage]); // Re-run only when the core context changes

  const saveDraft = useCallback(async (data: z.infer<typeof emailSchema>, attachments: Attachment[]) => {
    const formContent = editorRef.current?.getContent() || data.content;

    const hasRecipients = data.to || data.cc || data.bcc;
    const hasSubject = data.subject;
    const hasContent = formContent && formContent !== "<p></p>" && formContent !== "<p><br></p>";
    const hasAttachments = attachments.length > 0;

    if (!hasRecipients && !hasSubject && !hasContent && !hasAttachments) {
      console.log("Skipping save for empty draft.");
      return;
    }

    setIsSaving(true);

    const payload = {
      to: data.to ? data.to.split(",").map((e: string) => e.trim()).filter(Boolean) : [],
      cc: data.cc ? data.cc.split(",").map((e: string) => e.trim()).filter(Boolean) : [],
      bcc: data.bcc ? data.bcc.split(",").map((e: string) => e.trim()).filter(Boolean) : [],
      subject: data.subject || "",
      html: formContent,
      attachments: attachments.map((att) => att._id),
      in_reply_to_id: replyToMessage?.message_id || forwardMessage?.message_id,
    };

    try {
      const url = draftId ? `/api/drafts/${draftId}` : "/api/drafts";
      const method = draftId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Failed to save draft: ${response.statusText}`);

      const result = await response.json();

      if (!draftId && onDraftCreated) {
        onDraftCreated(result.draft._id);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [draftId, replyToMessage, forwardMessage, onDraftCreated]);


  const debouncedSave = useCallback(debounce(saveDraft, 1500), [saveDraft]);

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (formInitialized.current) {
        debouncedSave(value as z.infer<typeof emailSchema>, uploadedAttachments);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, debouncedSave, uploadedAttachments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Validate file size and type
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        toast({ title: "File too large", description: `${file.name} exceeds the 10MB limit.`, variant: "destructive" })
        return
      }
      if (!["image/jpeg", "image/png", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
        toast({ title: "Invalid file type", description: `${file.name} is not a valid file type.`, variant: "destructive" })
        return
      }
    }

    // Optimistic UI update
    const tempAttachments = Array.from(files).map((file) => ({
      _id: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      isUploading: true,
    }))
    setUploadedAttachments((prev) => [...prev, ...tempAttachments])

    // Actual upload logic
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const tempId = tempAttachments[i]._id
      const formData = new FormData()
      formData.append("file", file)
      formData.append("message_id", draftId || "new")
      try {
        const response = await fetch("/api/attachments", {
          method: "POST",
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

  const handleRemoveAttachment = (id: string) => setUploadedAttachments(p => p.filter(a => a._id !== id));
  const cleanup = async () => {
    if (draftId) {
      try {
        await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });

      } catch (error) { console.error("Failed to delete draft.", error) }
    }
  };
  const handleDeleteDraft = async () => {
    await cleanup();
    toast({ title: "Draft Discarded" });
    onClose();
  };
  const handleSignatureChange = (id: string | null, html: string) => {
    setSelectedSignature(id);
    setSignatureHtml(html);
  };
  const handleEditSubject = () => {
    setIsEditingSubject(true);
    if (onMinimize) {
      onMinimize();
    }
  };

  async function onSubmit(values: z.infer<typeof emailSchema>) {
    setIsSending(true)
    try {
      let finalHtml = editorRef.current?.getContent() || values.content;

      if (signatureHtml) {
        // More robustly inject signature before the blockquote
        const quoteIndex = finalHtml.indexOf('<blockquote');
        const userContent = quoteIndex !== -1 ? finalHtml.substring(0, quoteIndex) : finalHtml;
        const quotedBlock = quoteIndex !== -1 ? finalHtml.substring(quoteIndex) : '';
        finalHtml = `${userContent.trim()}<br><br>--<br>${signatureHtml}<br><br>${quotedBlock}`;
      }

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
      };

      // We explicitly call the send endpoint here
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to send email.");

      // After sending, discard the draft
      if (draftId) {
        await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
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

  // (Minimized view remains the same)
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

  // --- REFACTORED JSX WITH NEW FEATURES ---
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Area */}
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b flex-shrink-0">
        <div className="flex items-center space-x-1 max-w-[80%]">
          {replyToMessage && !isEditingSubject && onMinimize && (
            <Button variant="ghost" size="sm" onClick={handleEditSubject} className="h-6 px-2 text-xs">
              <Edit3 className="h-3 w-3 mr-1" />
              Edit Subject
            </Button>
          )}
          {onMinimize && (
            <span className="text-sm text-gray-600 truncate">{form.getValues("subject") || "New Message"}</span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {onMinimize && (
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minus className="h-3 w-3" />
            </Button>
          )}
          {onMaximize && (
            <Button variant="ghost" size="sm" onClick={onMaximize} className="h-6 w-6 p-0">
              <Minimize2 className="h-3 w-3" />
            </Button>
          )}
          {onMaximize && <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          {/* Email Fields */}
          <div className="p-4 border-b space-y-3 flex-shrink-0">
            {/* To Field with RecipientInput */}
            <div className="flex items-center">
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
                          className="border-0 border-b rounded-none focus-within:border-blue-500" // Add styling as needed
                        />
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

            {/* CC/BCC Fields */}
            {showCc && (
              <div className="flex items-center">
                <FormField
                  control={form.control}
                  name="cc"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <ContactAutocomplete
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Cc"
                          className="border-0 border-b rounded-none focus-within:border-blue-500" // Add styling as needed
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCc(false)} className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600">
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </div>
            )}
            {showBcc && (
              <div className="flex items-center">
                <FormField
                  control={form.control}
                  name="bcc"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <ContactAutocomplete
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Bcc"
                          className="border-0 border-b rounded-none focus-within:border-blue-500" // Add styling as needed
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

            {/* Conditionally Rendered Subject */}
            {(isEditingSubject || onMaximize) && (
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="flex items-center">
                    <FormControl>
                      <div className="border-0 border-b rounded-none p-1 w-full focus-within:border-blue-500">

                        <input {...field} placeholder="Subject" className="flex-1 border-none outline-0 text-sm focus:ring-0 shadow-none p-0 h-auto w-full bg-transparent min-w-[120px]" />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Editor & Collapsible Content */}
          <div className="flex-1 p-4 overflow-y-hidden">
            <RichTextEditor
              ref={editorRef}
              placeholder=""
              // CRITICAL FIX: The onChange handler now only updates the form's
              // value in the background. It does not trigger a re-render of the editor.
              onChange={(content) => {
                // `shouldDirty: true` is important for `form.watch` to detect the change.
                // `shouldTouch: true` can be useful for validation.
                form.setValue("content", content, { shouldDirty: true, shouldTouch: true });
              }}
              className="h-full"
              minHeight="50px"
              // CRITICAL FIX: This prop is now only used for the *initial* render.
              // Because RichTextEditor is memoized, it won't re-render and re-process this
              // prop when the parent's `isSaving` state changes.
              initialContent={form.getValues("content") || "<p><br></p>"}
              isToolbarVisible={isToolbarVisible}
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
          <div className="flex items-center bottom-0 justify-between p-2 bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={isSending} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                <span className="font-semibold">Send</span>
                <Send className="h-4 w-4 ml-2" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Attach files">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsToolbarVisible(!isToolbarVisible)} aria-label="Toggle Toolbar">
                <Baseline className="h-5 w-5" />
              </Button>
              <SignatureSelector selectedSignature={selectedSignature} onSignatureChange={handleSignatureChange} />
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-xs text-gray-500 h-4 inline">
                {isSaving ? "Saving..." : lastSaved && <span>Saved {format(lastSaved, "HH:mm")}</span>}
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