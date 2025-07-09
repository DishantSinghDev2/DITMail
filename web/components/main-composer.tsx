"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Minimize2, Send, MoreHorizontal } from "lucide-react"
import RichTextEditor, { type RichTextEditorRef } from "./rich-text-editor"
import EmailFields from "./email-fields"
import AttachmentManager from "./attachment-manager"

interface MainComposerProps {
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
  initialData?: {
    to?: string
    cc?: string
    bcc?: string
    subject?: string
    content?: string
  }
}

interface Attachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

export default function MainComposer({ isOpen, onClose, onMinimize, initialData }: MainComposerProps) {
  const [to, setTo] = useState(initialData?.to || "")
  const [cc, setCc] = useState(initialData?.cc || "")
  const [bcc, setBcc] = useState(initialData?.bcc || "")
  const [subject, setSubject] = useState(initialData?.subject || "")
  const [from, setFrom] = useState("your.email@gmail.com")
  const [content, setContent] = useState(initialData?.content || "")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const editorRef = useRef<RichTextEditorRef>(null)

  const handleSend = () => {
    console.log("Sending email:", { to, cc, bcc, subject, from, content, attachments })
    // Implement send logic
    onClose()
  }

  const handleSaveDraft = () => {
    console.log("Saving draft:", { to, cc, bcc, subject, from, content, attachments })
    // Implement save draft logic
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-medium">New Message</h2>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-8 w-8 p-0">
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(90vh-120px)]">
          {/* Email Fields */}
          <div className="p-4 border-b">
            <EmailFields
              to={to}
              cc={cc}
              bcc={bcc}
              subject={subject}
              from={from}
              onToChange={setTo}
              onCcChange={setCc}
              onBccChange={setBcc}
              onSubjectChange={setSubject}
              onFromChange={setFrom}
            />
          </div>

          {/* Editor */}
          <div className="flex-1 p-4 overflow-hidden">
            <RichTextEditor
              ref={editorRef}
              placeholder="Compose your message..."
              onChange={setContent}
              initialContent={content}
              className="h-full"
            />
          </div>

          {/* Attachments */}
          <div className="px-4">
            <AttachmentManager attachments={attachments} onAttachmentsChange={setAttachments} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="flex items-center space-x-2">
              <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button variant="outline" onClick={handleSaveDraft}>
                Save Draft
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
