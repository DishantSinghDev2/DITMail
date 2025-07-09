"use client"

import type React from "react"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, Paperclip, FileText, ImageIcon, Download } from "lucide-react"

interface Attachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

interface AttachmentManagerProps {
  attachments: Attachment[]
  onAttachmentsChange: (attachments: Attachment[]) => void
  className?: string
}

export default function AttachmentManager({
  attachments,
  onAttachmentsChange,
  className = "",
}: AttachmentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }))

    onAttachmentsChange([...attachments, ...newAttachments])
  }

  const removeAttachment = (id: string) => {
    const attachment = attachments.find((a) => a.id === id)
    if (attachment?.url) {
      URL.revokeObjectURL(attachment.url)
    }
    onAttachmentsChange(attachments.filter((a) => a.id !== id))
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className={className}>
      {attachments.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <div className="text-sm text-gray-600 mb-2 flex items-center">
            <Paperclip className="h-4 w-4 mr-1" />
            {attachments.length} attachment{attachments.length > 1 ? "s" : ""}
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto gmail-scrollbar">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getFileIcon(attachment.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{attachment.name}</div>
                    <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {attachment.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(attachment.url, "_blank")}
                      className="h-6 w-6 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(attachment.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 text-blue-600 hover:text-blue-800"
      >
        <Paperclip className="h-4 w-4 mr-1" />
        Attach files
      </Button>
    </div>
  )
}
