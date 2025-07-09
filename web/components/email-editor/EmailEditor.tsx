// components/email-editor/EmailEditor.tsx
"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { EmailEditorToolbar } from "./EmailEditorToolbar"
import "./EmailEditor.css"

interface EmailEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
}

export const EmailEditor = ({ content, onChange, placeholder }: EmailEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write your message here...",
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none focus:outline-none p-4",
      },
    },
  })

  return (
    <div className="border rounded-md">
      <EmailEditorToolbar editor={editor!} />
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}