"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Maximize2, X } from "lucide-react"
import { Attachment, EmailEditor } from "./editor/email-editor"
import { emailSchema } from "@/lib/schemas"
import z from "zod"

interface MiniComposerProps {
  isOpen: boolean
  onClose: () => void
  onMaximize: () => void
  replyToMessage?: any
  forwardMessage?: any
  draftId?: string
  initialData?: z.infer<typeof emailSchema> | null
  initialAttachments?: Attachment[] // <-- ADD THIS
  onDataChange?: (data: z.infer<typeof emailSchema>, attachments: Attachment[]) => void // <-- ADD THIS
}

export default function MiniComposer({
  isOpen,
  onClose,
  onMaximize,
  replyToMessage,
  forwardMessage,
  draftId,
  initialData = null,
  initialAttachments = [], // <-- ADD THIS
  onDataChange, // <-- ADD THIS
}: MiniComposerProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  const handleSent = () => {
    console.log("Email sent from mini composer")
    onClose()
  }

  if (!isOpen) return null

  return (
    <Card className="fixed bottom-0 right-10 w-[35%] overflow-hidden shadow-2xl border-t-4 border-t-blue-500 z-50 bg-white transition-all duration-200">
      {isMinimized ? (
        <div className="p-2 bg-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 truncate">
              {replyToMessage?.subject || forwardMessage?.subject || "New Message"}
            </span>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" onClick={() => setIsMinimized(false)} className="h-6 w-6 p-0">
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-[450px] ">
          <EmailEditor
            onClose={onClose}
            onSent={handleSent}
            onMinimize={() => setIsMinimized(true)}
            onMaximize={onMaximize}
            replyToMessage={replyToMessage}
            forwardMessage={forwardMessage}
            initialDraftId={draftId}
            isMinimized={false}
            initialData={initialData}
            initialAttachments={initialAttachments} // <-- PASS DOWN
            onDataChange={onDataChange} // <-- PASS DOWN
          />
        </div>
      )}
    </Card>
  )
}
