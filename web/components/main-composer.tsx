"use client"

import { Card } from "@/components/ui/card"
import { Attachment, EmailEditor } from "./editor/email-editor"
import { init } from "@sentry/nextjs"
import { initial } from "lodash"
import { emailSchema } from "@/lib/schemas"
import z from "zod"

interface MainComposerProps {
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
  replyToMessage?: any
  forwardMessage?: any
  draftId?: string
  initialData?: z.infer<typeof emailSchema> | null
  initialAttachments?: Attachment[] // <-- ADD THIS
  onDataChange?: (data: z.infer<typeof emailSchema>, attachments: Attachment[]) => void // <-- ADD THIS
}

export default function MainComposer({
  isOpen,
  onClose,
  onMinimize,
  replyToMessage,
  forwardMessage,
  draftId,
  initialData = null,
  initialAttachments = [], // <-- ADD THIS
  onDataChange, // <-- ADD THIS
}: MainComposerProps) {

  const handleSent = () => {
    console.log("Email sent from mini composer")
    onClose()
  }

  if (!isOpen) return null

  return (
    <Card className="fixed top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-[60%] overflow-hidden shadow-2xl z-50 bg-white transition-all duration-200">
      <div className="flex flex-col h-[80vh] ">
        <EmailEditor
          onClose={onClose}
          onSent={handleSent}
          onMinimize={onMinimize}
          replyToMessage={replyToMessage}
          forwardMessage={forwardMessage}
          initialDraftId={draftId}
          isMinimized={false}
          initialData={initialData}
          initialAttachments={initialAttachments} // <-- PASS DOWN
          onDataChange={onDataChange} // <-- PASS DOWN
        />
      </div>
    </Card>
  )
}
