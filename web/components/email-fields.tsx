"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronUp } from "lucide-react"

interface EmailFieldsProps {
  to: string
  cc: string
  bcc: string
  subject: string
  onToChange: (value: string) => void
  onCcChange: (value: string) => void
  onBccChange: (value: string) => void
  onSubjectChange: (value: string) => void
  showCc?: boolean
  showBcc?: boolean
}

export default function EmailFields({
  to,
  cc,
  bcc,
  subject,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  showCc: initialShowCc = false,
  showBcc: initialShowBcc = false,
}: EmailFieldsProps) {
  const [showCc, setShowCc] = useState(initialShowCc)
  const [showBcc, setShowBcc] = useState(initialShowBcc)

  return (
    <div className="space-y-2">

      {/* To Field */}
      <div className="flex items-center">
        <label className="w-12 text-sm text-gray-600 flex-shrink-0">To</label>
        <div className="flex-1 flex items-center">
          <Input
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            placeholder="Recipients"
            className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
          />
          <div className="flex items-center ml-2 space-x-1">
            {!showCc && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(true)}
                className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
              >
                Cc
              </Button>
            )}
            {!showBcc && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(true)}
                className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
              >
                Bcc
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* CC Field */}
      {showCc && (
        <div className="flex items-center">
          <label className="w-12 text-sm text-gray-600 flex-shrink-0">Cc</label>
          <div className="flex-1 flex items-center">
            <Input
              value={cc}
              onChange={(e) => onCcChange(e.target.value)}
              placeholder="Carbon copy recipients"
              className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCc(false)}
              className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* BCC Field */}
      {showBcc && (
        <div className="flex items-center">
          <label className="w-12 text-sm text-gray-600 flex-shrink-0">Bcc</label>
          <div className="flex-1 flex items-center">
            <Input
              value={bcc}
              onChange={(e) => onBccChange(e.target.value)}
              placeholder="Blind carbon copy recipients"
              className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBcc(false)}
              className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Subject Field */}
      <div className="flex items-center">
        <label className="w-12 text-sm text-gray-600 flex-shrink-0">Subject</label>
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Subject"
          className="border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-blue-500"
        />
      </div>
    </div>
  )
}
