"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Maximize2, X } from "lucide-react"
import { EmailEditor } from "./editor/email-editor"

interface MainComposerProps {
  isOpen: boolean
  onClose: () => void
  onMaximize: () => void
  replyToMessage?: any
  forwardMessage?: any
  draftId?: string
}

export default function MainComposer({
  isOpen,
  onClose,
  onMaximize,
  replyToMessage,
  forwardMessage,
  draftId,
}: MainComposerProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  const handleSent = () => {
    console.log("Email sent from mini composer")
    onClose()
  }

  if (!isOpen) return null

  return (
    <Card className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-[60%] overflow-hidden shadow-2xl border-t-4 border-t-blue-500 z-50 bg-white transition-all duration-200">
      <div className="flex flex-col h-[80vh] ">
        <EmailEditor
          onClose={onClose}
          onSent={handleSent}
          onMinimize={() => setIsMinimized(true)}
          onMaximize={onMaximize}
          replyToMessage={replyToMessage}
          forwardMessage={forwardMessage}
          initialDraftId={draftId}
          isMinimized={false}
          showWindowControls={true}
        />
      </div>
    </Card>
  )
}
