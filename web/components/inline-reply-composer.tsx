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
}

export default function InlineReplyComposer({ originalMessage, onClose, onSent }: InlineReplyComposerProps) {
  const [mode, setMode] = useState<"reply" | "forward" | null>(null)
  const [showMiniComposer, setShowMiniComposer] = useState(false)
  const [showFullComposer, setShowFullComposer] = useState(false)

  const handleReply = () => {
    setMode("reply")
    setShowFullComposer(true)
  }

  const handleForward = () => {
    setMode("forward")
    setShowFullComposer(true)
  }

  const handleMinimize = () => {
    setShowFullComposer(false)
    setShowMiniComposer(true)
  }

  const handleMaximize = () => {
    setShowMiniComposer(false)
    setShowFullComposer(true)
  }

  const handleSent = () => {
    setMode(null)
    setShowFullComposer(false)
    setShowMiniComposer(false)
    onSent()
  }

  const handleClose = () => {
    setMode(null)
    setShowFullComposer(false)
    setShowMiniComposer(false)
    onClose()
  }

  return (
    <>
      {/* Original Message */}
      <Card className="mb-4 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">{originalMessage.subject}</h3>
              <p className="text-xs text-gray-600">From: {originalMessage.from}</p>
              <p className="text-xs text-gray-500">{new Date(originalMessage.created_at).toLocaleString()}</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleReply}>
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
              <Button variant="outline" size="sm" onClick={handleForward}>
                <Forward className="h-3 w-3 mr-1" />
                Forward
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto gmail-scrollbar">
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: originalMessage.html }} />
        </div>
      </Card>

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
