"use client"

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bold, Italic, Underline, AlignLeft, List, LinkIcon, Undo, Redo, Type, Palette } from "lucide-react"

const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Georgia",
  "Palatino",
  "Garamond",
  "Bookman",
  "Comic Sans MS",
  "Trebuchet MS",
  "Arial Black",
]

const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "22", "24", "26", "28", "36", "48", "72"]

const COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#d9d9d9",
  "#efefef",
  "#f3f3f3",
  "#ffffff",
  "#980000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#e6b8af",
  "#f4cccc",
  "#fce5cd",
  "#fff2cc",
  "#d9ead3",
  "#d0e0e3",
  "#c9daf8",
  "#cfe2f3",
  "#d9d2e9",
  "#ead1dc",
]

interface RichTextEditorProps {
  placeholder?: string
  className?: string
  initialContent?: string
  onChange?: (content: string) => void
}

export interface RichTextEditorRef {
  getContent: () => string
  setContent: (content: string) => void
  focus: () => void
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ placeholder = "Compose your message...", className = "", initialContent = "", onChange }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const [fontSize, setFontSize] = useState("12")
    const [fontFamily, setFontFamily] = useState("Arial")

    useImperativeHandle(ref, () => ({
      getContent: () => editorRef.current?.innerHTML || "",
      setContent: (content: string) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = content
        }
      },
      focus: () => editorRef.current?.focus(),
    }))

    const executeCommand = useCallback(
      (command: string, value?: string) => {
        document.execCommand(command, false, value)
        editorRef.current?.focus()
        onChange?.(editorRef.current?.innerHTML || "")
      },
      [onChange],
    )

    const handlePaste = useCallback(
      (e: ClipboardEvent) => {
        e.preventDefault()
        const clipboardData = e.clipboardData
        if (!clipboardData) return

        const htmlData = clipboardData.getData("text/html")
        const textData = clipboardData.getData("text/plain")

        if (htmlData) {
          const cleanHtml = htmlData
            .replace(/<meta[^>]*>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<!--[\s\S]*?-->/gi, "")

          document.execCommand("insertHTML", false, cleanHtml)
        } else if (textData) {
          document.execCommand("insertText", false, textData)
        }
        onChange?.(editorRef.current?.innerHTML || "")
      },
      [onChange],
    )

    const handleCopy = useCallback((e: ClipboardEvent) => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const contents = range.cloneContents()
      const tempDiv = document.createElement("div")
      tempDiv.appendChild(contents)

      const htmlContent = tempDiv.innerHTML
      const textContent = selection.toString()

      e.clipboardData?.setData("text/html", htmlContent)
      e.clipboardData?.setData("text/plain", textContent)
      e.preventDefault()
    }, [])

    useEffect(() => {
      const editor = editorRef.current
      if (!editor) return

      editor.addEventListener("paste", handlePaste)
      editor.addEventListener("copy", handleCopy)
      editor.addEventListener("cut", handleCopy)

      if (initialContent) {
        editor.innerHTML = initialContent
      }

      return () => {
        editor.removeEventListener("paste", handlePaste)
        editor.removeEventListener("copy", handleCopy)
        editor.removeEventListener("cut", handleCopy)
      }
    }, [handlePaste, handleCopy, initialContent])

    const changeFontSize = (size: string) => {
      setFontSize(size)
      executeCommand("fontSize", "3")
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        if (!range.collapsed) {
          const span = document.createElement("span")
          span.style.fontSize = size + "px"
          try {
            range.surroundContents(span)
          } catch {
            span.appendChild(range.extractContents())
            range.insertNode(span)
          }
          selection.removeAllRanges()
        }
      }
    }

    const changeFontFamily = (family: string) => {
      setFontFamily(family)
      executeCommand("fontName", family)
    }

    const insertLink = () => {
      const url = prompt("Enter URL:")
      if (url) executeCommand("createLink", url)
    }

    const insertImage = () => {
      const url = prompt("Enter image URL:")
      if (url) executeCommand("insertImage", url)
    }

    return (
      <div className={`border rounded-lg bg-white ${className}`}>
        {/* Toolbar */}
        <div className="border-b p-2 bg-gray-50 flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => executeCommand("undo")} className="h-7 w-7 p-0">
            <Undo className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("redo")} className="h-7 w-7 p-0">
            <Redo className="h-3 w-3" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 min-w-[80px] justify-between text-xs">
                {fontFamily}
                <Type className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto">
              {FONT_FAMILIES.map((font) => (
                <DropdownMenuItem key={font} onClick={() => changeFontFamily(font)} style={{ fontFamily: font }}>
                  {font}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-10 justify-center text-xs">
                {fontSize}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {FONT_SIZES.map((size) => (
                <DropdownMenuItem key={size} onClick={() => changeFontSize(size)}>
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Button variant="ghost" size="sm" onClick={() => executeCommand("bold")} className="h-7 w-7 p-0">
            <Bold className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("italic")} className="h-7 w-7 p-0">
            <Italic className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("underline")} className="h-7 w-7 p-0">
            <Underline className="h-3 w-3" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Palette className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid grid-cols-10 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => executeCommand("foreColor", color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" onClick={() => executeCommand("justifyLeft")} className="h-7 w-7 p-0">
            <AlignLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => executeCommand("insertUnorderedList")}
            className="h-7 w-7 p-0"
          >
            <List className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={insertLink} className="h-7 w-7 p-0">
            <LinkIcon className="h-3 w-3" />
          </Button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          className="min-h-[200px] p-3 focus:outline-none overflow-y-auto max-h-[400px] gmail-scrollbar"
          style={{
            fontFamily: fontFamily,
            fontSize: fontSize + "px",
            lineHeight: "1.4",
          }}
          suppressContentEditableWarning={true}
          onInput={() => onChange?.(editorRef.current?.innerHTML || "")}
          data-placeholder={placeholder}
        />
      </div>
    )
  },
)

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor
