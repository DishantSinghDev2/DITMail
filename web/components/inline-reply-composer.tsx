"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { EmailEditor, Attachment } from "./editor/email-editor";
import { useComposerStore } from "@/lib/store/composer"; // To "pop-out" to the global composer
import { z } from "zod";
import { emailSchema } from "@/lib/schemas";
import { Message } from "@/types"; // Make sure you have a strong Message type

// --- PROPS INTERFACE ---
interface InlineReplyComposerProps {
  originalMessage: Message;
  onClose: () => void;
  onSent: (sentMessage: Message) => void; // Pass the new message up for optimistic UI
  composeMode: "reply" | "forward";
}

// A simple loading skeleton to show while checking for drafts
const ComposerSkeleton = () => (
  <Card className="mb-4 p-4 shadow-inner bg-gray-50/50">
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-40 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded w-1/4 mt-4"></div>
    </div>
  </Card>
);

export default function InlineReplyComposer({
  originalMessage,
  onClose,
  onSent,
  composeMode,
}: InlineReplyComposerProps) {
  // --- STATE ---
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [initialData, setInitialData] = useState<z.infer<typeof emailSchema> | null>(null);
  const [initialAttachments, setInitialAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ZUSTAND STORE ACTIONS ---
  const openComposer = useComposerStore((state) => state.openComposer);

  // --- DRAFT LOADING EFFECT ---
  // On mount, check if a draft for this conversation already exists.
  useEffect(() => {
    const findExistingDraft = async () => {
      if (!originalMessage.thread_id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // NOTE: This requires a new API endpoint: GET /api/drafts/by-thread/[thread_id]
        // This endpoint should find a draft where `in_reply_to_id` matches a message
        // in the given thread and `user_id` matches the current user.
        const res = await fetch(`/api/drafts/by-thread/${originalMessage.thread_id}`);

        if (res.ok) {
          const { draft } = await res.json();
          setDraftId(draft._id);
          // Pre-populate the form with the found draft's data.
          setInitialData({
            to: draft.to?.join(", ") || "",
            cc: draft.cc?.join(", ") || "",
            bcc: draft.bcc?.join(", ") || "",
            subject: draft.subject || "",
            content: draft.html || "<p><br></p>",
            attachments: draft.attachments?.map((a: any) => a._id) || [],
          });
          setInitialAttachments(draft.attachments || []);
        }
      } catch (error) {
        console.warn("No existing draft found for this thread, creating a new one.");
        // If it fails (e.g., a 404), we simply proceed with a blank composer.
      } finally {
        setIsLoading(false);
      }
    };

    findExistingDraft();
  }, [originalMessage.thread_id]);

  // --- HANDLERS ---

  // Callback for EmailEditor to update our state when a new draft is created on the first edit.
  const handleDraftCreated = useCallback((newDraftId: string) => {
    setDraftId(newDraftId);
  }, []);

  // "Pop-out" functionality to move from inline to the floating mini-composer.
  const handlePopOut = () => {
    // 1. Open the global floating composer, passing the current draft's state.
    openComposer({
      draftId: draftId,
      replyToMessage: composeMode === "reply" ? originalMessage : undefined,
      forwardMessage: composeMode === "forward" ? originalMessage : undefined,
      // The main composer will use the draftId to fetch the latest content itself.
    });

    // 2. Close the inline version.
    onClose();
  };

  if (isLoading) {
    return <ComposerSkeleton />;
  }

  // --- RENDER ---
  return (
    <Card className="mb-4 shadow-inner bg-gray-50/50">
      <div className="h-[450px]">
        <EmailEditor
          // Core props for draft management
          draftId={draftId}
          onDraftCreated={handleDraftCreated}
          
          // Data to pre-populate the editor
          replyToMessage={composeMode === "reply" ? originalMessage : undefined}
          forwardMessage={composeMode === "forward" ? originalMessage : undefined}
          initialData={initialData}
          initialAttachments={initialAttachments}

          // Actions and event handlers
          onClose={onClose}
          onSent={onSent} // Pass the parent's onSent handler directly
          onPopOut={handlePopOut} // This prop needs to be added to EmailEditor's header
        />
      </div>
    </Card>
  );
}