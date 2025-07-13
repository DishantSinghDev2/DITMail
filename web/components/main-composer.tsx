"use client"

import { Card } from "@/components/ui/card"
import { EmailEditor } from "./editor/email-editor"

interface MainComposerProps {
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
  replyToMessage?: any
  forwardMessage?: any
  draftId?: string
}

export default function MainComposer({
  isOpen,
  onClose,
  onMinimize,
  replyToMessage,
  forwardMessage,
  draftId,
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
        />
      </div>
    </Card>
  )
}
