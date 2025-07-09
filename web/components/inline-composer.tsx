"use client"
import { useState } from "react"
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { EmailEditor } from "@/components/editor/email-editor"

interface InlineComposerProps {
  mode: "reply" | "forward"
  originalMessage: any
  onClose: () => void
  onSent: () => void
  draftId?: string
}

export default function InlineComposer({ mode, originalMessage, onClose, onSent, draftId }: InlineComposerProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  return (
    <div
      className={`fixed bottom-0 right-4 flex flex-col bg-background shadow-2xl border border-gray-300 transition-all duration-300 z-50 ${
        isMaximized ? "w-full h-full right-0 rounded-none" : "w-[680px] h-[600px] rounded-t-lg"
      }`}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-2 bg-gray-100 rounded-t-lg border-b">
        <span className="text-sm font-medium text-gray-700 capitalize">
          {originalMessage?.subject ? originalMessage.subject : "New Message"}
        </span>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-gray-500 hover:text-gray-800"
            aria-label={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <ArrowsPointingInIcon className="h-4 w-4" /> : <ArrowsPointingOutIcon className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Email Editor */}
      <div className="flex-1 min-h-0">
        <EmailEditor
          onClose={onClose}
          onSent={onSent}
          replyToMessage={mode === "reply" ? originalMessage : undefined}
          forwardMessage={mode === "forward" ? originalMessage : undefined}
          initialDraftId={draftId}
        />
      </div>
    </div>
  )
}
