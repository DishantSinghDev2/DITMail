"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Maximize2, X } from "lucide-react";
import { Attachment, EmailEditor } from "./editor/email-editor"; // Corrected path
import { emailSchema } from "@/lib/schemas";
import { z } from "zod";

interface MiniComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onMaximize: () => void;
  replyToMessage?: any;
  forwardMessage?: any;
  draftId?: string; // Correctly named prop
  initialData?: z.infer<typeof emailSchema> | null;
  initialAttachments?: Attachment[];
  onDataChange?: (data: z.infer<typeof emailSchema>, attachments: Attachment[]) => void;
  onDraftCreated?: (newDraftId: string) => void;
}

export default function MiniComposer({
  isOpen,
  onClose,
  onMaximize,
  replyToMessage,
  forwardMessage,
  draftId, // Correctly named prop
  initialData = null,
  initialAttachments = [],
  onDataChange,
  onDraftCreated
}: MiniComposerProps) {
  
  // The isMinimized state for the header is internal to this component
  const [isHeaderMinimized, setIsHeaderMinimized] = useState(false);

  const handleSent = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-0 right-10 w-[580px] h-[480px] flex flex-col overflow-hidden shadow-2xl z-50 bg-white rounded-t-lg">
      {/* 
        This component no longer needs its own isMinimized logic for the body, 
        as the parent Composer handles swapping between Mini and Main composers.
        The EmailEditor is always visible inside the MiniComposer.
      */}
      <EmailEditor
        onClose={onClose}
        onSent={handleSent}
        onMaximize={onMaximize} // Pass the onMaximize handler
        onMinimize={undefined} // Mini composer doesn't have a minimize action, only a header toggle if needed
        replyToMessage={replyToMessage}
        forwardMessage={forwardMessage}
        draftId={draftId} // <-- CRITICAL FIX: Pass the correct prop name
        isMinimized={false} // This editor instance is never in the "minimized" state
        initialData={initialData}
        initialAttachments={initialAttachments}
        onDataChange={onDataChange}
        onDraftCreated={onDraftCreated} // Pass the callback down
      />
    </Card>
  );
}