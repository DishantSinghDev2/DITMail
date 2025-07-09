"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Reply, Forward } from "lucide-react"
import { EmailEditor } from "./editor/email-editor"
import MiniComposer from "./mini-composer"

interface InlineReplyComposerProps {
  originalMessage: any
  onClose: () => void
  onSent: () => void
  composeMode?: "reply" | "forward"
}

export default function InlineReplyComposer({ originalMessage, onClose, onSent, composeMode }: InlineReplyComposerProps) {
  const [mode, setMode] = useState<"reply" | "forward" | undefined>(composeMode)
  const [showMiniComposer, setShowMiniComposer] = useState(false)
  const [showFullComposer, setShowFullComposer] = useState(false)

  const handleMinimize = () => {
    setShowFullComposer(false)
    setShowMiniComposer(true)
  }

  const handleMaximize = () => {
    setShowMiniComposer(false)
    setShowFullComposer(true)
  }

  const handleSent = () => {
    setMode(undefined)
    setShowFullComposer(false)
    setShowMiniComposer(false)
    onSent()
  }

  const handleClose = () => {
    setMode(undefined)
    setShowFullComposer(false)
    setShowMiniComposer(false)
    onClose()
  }

  return (
    <>
      {/* Inline Composer */}
      {showFullComposer && mode && (
        <Card className="mb-4">
          <div className="h-[500px]">
            <EmailEditor
              onClose={handleClose}
              onSent={handleSent}
              onMinimize={handleMinimize}
              replyToMessage={mode === "reply" ? originalMessage : undefined}
              forwardMessage={mode === "forward" ? originalMessage : undefined}
              showWindowControls={true}
            />
          </div>
        </Card>
      )}

      {/* Mini Composer */}
      <MiniComposer
        isOpen={showMiniComposer}
        onClose={handleClose}
        onMaximize={handleMaximize}
        replyToMessage={mode === "reply" ? originalMessage : undefined}
        forwardMessage={mode === "forward" ? originalMessage : undefined}
      />
    </>
  )
}
