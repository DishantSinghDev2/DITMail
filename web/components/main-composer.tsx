"use client";

import { Card } from "@/components/ui/card";
import { Attachment, EmailEditor } from "./editor/email-editor"; // Corrected path
import { emailSchema } from "@/lib/schemas";
import { z } from "zod";

interface MainComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  replyToMessage?: any;
  forwardMessage?: any;
  draftId?: string; // Correctly named prop
  initialData?: z.infer<typeof emailSchema> | null;
  initialAttachments?: Attachment[];
  onDataChange?: (data: z.infer<typeof emailSchema>, attachments: Attachment[]) => void;
  onDraftCreated?: (newDraftId: string) => void;
}

export default function MainComposer({
  isOpen,
  onClose,
  onMinimize,
  replyToMessage,
  forwardMessage,
  draftId, // Correctly named prop
  initialData = null,
  initialAttachments = [],
  onDataChange,
  onDraftCreated,
}: MainComposerProps) {

  const handleSent = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    // This styling creates the modal-like appearance
    <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
        <Card className="w-[90%] max-w-4xl h-[85vh] flex flex-col shadow-2xl z-50 bg-white rounded-lg">
            <EmailEditor
              onClose={onClose}
              onSent={handleSent}
              onMinimize={onMinimize} // Pass the onMinimize handler
              onMaximize={undefined} // Main composer cannot be maximized further
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
    </div>
  );
}