"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { EmailEditor, Attachment } from "./editor/email-editor";
import { useComposerStore } from "@/lib/store/composer";
import { z } from "zod";
import { emailSchema } from "@/lib/schemas";
import { Message } from "@/types";

interface InlineReplyComposerProps {
  originalMessage: Message;
  onClose: () => void;
  onSent: (sentMessage: Message) => void;
  composeMode: "reply" | "forward";
}

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
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [initialData, setInitialData] = useState<z.infer<typeof emailSchema> | null>(null);
  const [initialAttachments, setInitialAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const openComposer = useComposerStore((state) => state.openComposer);

  useEffect(() => {
    const findExistingDraft = async () => {
      if (!originalMessage.thread_id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/drafts/by-thread/${originalMessage.thread_id}`);

        if (res.ok) {
          const { draft } = await res.json();
          setDraftId(draft._id);
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
      } finally {
        setIsLoading(false);
      }
    };

    findExistingDraft();
  }, [originalMessage.thread_id]);


  const handleDraftCreated = useCallback((newDraftId: string) => {
    setDraftId(newDraftId);
  }, []);

  const handlePopOut = () => {
    openComposer({
      draftId: draftId,
      replyToMessage: composeMode === "reply" ? originalMessage : undefined,
      forwardMessage: composeMode === "forward" ? originalMessage : undefined,
    });

    onClose();
  };

  if (isLoading) {
    return <ComposerSkeleton />;
  }

  return (
    <Card className="mb-4 shadow-inner bg-gray-50/50">
      <div className="h-[450px]">
        <EmailEditor
          draftId={draftId}
          onDraftCreated={handleDraftCreated}
          
          replyToMessage={composeMode === "reply" ? originalMessage : undefined}
          forwardMessage={composeMode === "forward" ? originalMessage : undefined}
          initialData={initialData}
          initialAttachments={initialAttachments}

          onClose={onClose}
          onSent={onSent}
          onPopOut={handlePopOut}
        />
      </div>
    </Card>
  );
}