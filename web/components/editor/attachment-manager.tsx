"use client"

import { Button } from "@/components/ui/button"
import { X, Paperclip, FileText, ImageIcon, Download, Loader2 } from "lucide-react"
import { formatFileSize } from "@/lib/utils"

interface Attachment {
  _id: string
  name: string
  size: number
  type: string
  url?: string
  isUploading?: boolean
}

interface AttachmentManagerProps {
  attachments: Attachment[]
  onAttachmentsChange: (attachments: Attachment[]) => void
  onRemoveAttachment: (id: string) => void
  className?: string
}

export default function AttachmentManager({ attachments, onRemoveAttachment, className = "" }: AttachmentManagerProps) {
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  if (attachments.length === 0) return null

  return (
    <div className={`border-t pt-3 mt-3 ${className}`}>
      <div className="text-sm text-gray-600 mb-2 flex items-center">
        <Paperclip className="h-4 w-4 mr-1" />
        {attachments.length} attachment{attachments.length > 1 ? "s" : ""}
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto gmail-scrollbar">
        {attachments.map((attachment) => (
          <div key={attachment._id} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {attachment.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : getFileIcon(attachment.type)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{attachment.name}</div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(attachment.size)}
                  {attachment.isUploading && " - Uploading..."}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {attachment.url && !attachment.isUploading && (
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
                onClick={() => onRemoveAttachment(attachment._id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                disabled={attachment.isUploading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
