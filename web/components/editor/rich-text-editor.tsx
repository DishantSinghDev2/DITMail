"use client"

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, List,
  ListOrdered, Indent, Outdent, LinkIcon, Undo, Redo, Type, Palette, Highlighter, MoreHorizontal
} from "lucide-react"

// --- CONSTANTS ---
const FONT_FAMILIES = [ "Arial", "Helvetica", "Times New Roman", "Courier New", "Verdana", "Georgia", "Palatino", "Garamond", "Bookman", "Comic Sans MS", "Trebuchet MS", "Arial Black"]
const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "22", "24", "26", "28", "36", "48", "72"]
const COLORS = [ "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff", "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"]

// --- COMPONENT PROPS AND REF ---
interface RichTextEditorProps {
  placeholder?: string
  className?: string
  initialContent?: string
  onChange?: (content: string) => void
  minHeight?: string
  mode?: "compose" | "reply" | "forward"
}

export interface RichTextEditorRef {
  getContent: () => string
  setContent: (content: string) => void
  focus: () => void
}

// --- MAIN COMPONENT ---
const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      placeholder = "Compose your message...",
      className = "",
      initialContent = "",
      onChange,
      minHeight = "100px",
      mode = "compose"
    },
    ref,
  ) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const [fontSize, setFontSize] = useState("12")
    const [fontFamily, setFontFamily] = useState("Arial")
    const [quotedHtml, setQuotedHtml] = useState("")
    const [isQuotedContentExpanded, setIsQuotedContentExpanded] = useState(mode === "forward")

    // --- CONTENT PROCESSING & IMPERATIVE HANDLE ---
    const processInitialContent = useCallback((content: string) => {
      if ((mode === "reply" || mode === "forward") && content.includes("<blockquote")) {
        const parts = content.split(/<blockquote.*?>/)
        const userContent = parts[0] || "<p><br></p>"
        const quote = content.substring(userContent.length)
        setQuotedHtml(quote)
        return userContent
      }
      if (mode === 'forward') {
          setQuotedHtml(content);
          return "<p><br></p>"; // Start with a clean slate for forwarding
      }
      return content
    }, [mode])

    useImperativeHandle(ref, () => ({
      getContent: () => {
        const userContent = editorRef.current?.innerHTML || ""
        return userContent + (quotedHtml || "")
      },
      setContent: (content: string) => {
        if (editorRef.current) {
          const userContent = processInitialContent(content)
          editorRef.current.innerHTML = userContent
        }
      },
      focus: () => editorRef.current?.focus(),
    }))

    // --- CORE EDITING LOGIC ---
    const executeCommand = useCallback((command: string, value?: string) => {
      document.execCommand(command, false, value)
      editorRef.current?.focus()
      if (onChange) {
        const userContent = editorRef.current?.innerHTML || ""
        onChange(userContent + quotedHtml)
      }
    }, [onChange, quotedHtml])

    // --- ENHANCED EVENT HANDLERS ---
    const handlePaste = useCallback((e: ClipboardEvent) => {
      e.preventDefault()
      const clipboardData = e.clipboardData
      if (!clipboardData) return
      
      const htmlData = clipboardData.getData("text/html")
      if (htmlData) {
        const cleanHtml = htmlData.replace(/<meta[^>]*>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        document.execCommand("insertHTML", false, cleanHtml)
      } else {
        const textData = clipboardData.getData("text/plain")
        document.execCommand("insertText", false, textData)
      }
      if (onChange) {
        const userContent = editorRef.current?.innerHTML || ""
        onChange(userContent + quotedHtml)
      }
    }, [onChange, quotedHtml])

    const handleCopy = useCallback((e: ClipboardEvent) => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      
      const range = selection.getRangeAt(0)
      const contents = range.cloneContents()
      const tempDiv = document.createElement("div")
      tempDiv.appendChild(contents)
      
      e.clipboardData?.setData("text/html", tempDiv.innerHTML)
      e.clipboardData?.setData("text/plain", selection.toString())
      e.preventDefault()
    }, [])

    useEffect(() => {
      const editor = editorRef.current
      if (!editor) return
      
      editor.addEventListener("paste", handlePaste)
      editor.addEventListener("copy", handleCopy)
      editor.addEventListener("cut", handleCopy)
      
      return () => {
        editor.removeEventListener("paste", handlePaste)
        editor.removeEventListener("copy", handleCopy)
        editor.removeEventListener("cut", handleCopy)
      }
    }, [handlePaste, handleCopy])

    // --- INITIALIZATION ---
    useEffect(() => {
      if (editorRef.current && initialContent) {
        const userContent = processInitialContent(initialContent)
        editorRef.current.innerHTML = userContent
      }
    }, [initialContent, processInitialContent])
    
    // --- TOOLBAR ACTIONS ---
    const changeFontSize = (size: string) => {
      setFontSize(size)
      // Applying font size via CSS is more reliable than the deprecated fontSize command
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontSize", false, "1"); // Placeholder value
      const fontElements = document.querySelectorAll<HTMLElement>('font[size="1"]');
      fontElements.forEach(el => {
        el.style.fontSize = size + 'px';
        el.removeAttribute('size');
      });
      document.execCommand("styleWithCSS", false, "false");
    }

    const changeFontFamily = (family: string) => {
      setFontFamily(family)
      executeCommand("fontName", family)
    }

    const insertLink = () => {
      const url = prompt("Enter URL:")
      if (url) executeCommand("createLink", url)
    }

    // --- JSX RENDER ---
    return (
      <div className={`border rounded-lg bg-white overflow-hidden flex flex-col ${className}`}>
        {/* Toolbar */}
        <div className="border-b p-2 bg-gray-50 flex flex-wrap items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => executeCommand("undo")} className="h-7 w-7 p-0"><Undo className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("redo")} className="h-7 w-7 p-0"><Redo className="h-3 w-3" /></Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 min-w-[80px] justify-between text-xs">{fontFamily}<Type className="h-3 w-3 ml-1" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto">
              {FONT_FAMILIES.map((font) => <DropdownMenuItem key={font} onClick={() => changeFontFamily(font)} style={{ fontFamily: font }}>{font}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-10 justify-center text-xs">{fontSize}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {FONT_SIZES.map((size) => <DropdownMenuItem key={size} onClick={() => changeFontSize(size)}>{size}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />
          
          <Button variant="ghost" size="sm" onClick={() => executeCommand("bold")} className="h-7 w-7 p-0"><Bold className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("italic")} className="h-7 w-7 p-0"><Italic className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("underline")} className="h-7 w-7 p-0"><Underline className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("strikeThrough")} className="h-7 w-7 p-0"><Strikethrough className="h-3 w-3" /></Button>
          
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Palette className="h-3 w-3" /></Button></PopoverTrigger>
            <PopoverContent className="w-64 p-2"><div className="grid grid-cols-10 gap-1">{COLORS.map((color) => (<button key={color} className="w-5 h-5 rounded border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => executeCommand("foreColor", color)}/>))}</div></PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Highlighter className="h-3 w-3" /></Button></PopoverTrigger>
            <PopoverContent className="w-64 p-2"><div className="grid grid-cols-10 gap-1">{COLORS.map((color) => (<button key={color} className="w-5 h-5 rounded border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => executeCommand("backColor", color)}/>))}</div></PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Button variant="ghost" size="sm" onClick={() => executeCommand("justifyLeft")} className="h-7 w-7 p-0"><AlignLeft className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("justifyCenter")} className="h-7 w-7 p-0"><AlignCenter className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("justifyRight")} className="h-7 w-7 p-0"><AlignRight className="h-3 w-3" /></Button>
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          <Button variant="ghost" size="sm" onClick={() => executeCommand("insertUnorderedList")} className="h-7 w-7 p-0"><List className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("insertOrderedList")} className="h-7 w-7 p-0"><ListOrdered className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("outdent")} className="h-7 w-7 p-0"><Outdent className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("indent")} className="h-7 w-7 p-0"><Indent className="h-3 w-3" /></Button>
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button variant="ghost" size="sm" onClick={insertLink} className="h-7 w-7 p-0"><LinkIcon className="h-3 w-3" /></Button>
        </div>

        {/* Editing Area and Quoted Content */}
        <div className="flex-grow overflow-y-auto ditmail-scrollbar max-h-[30vh]">
            <div
                ref={editorRef}
                contentEditable
                className="p-3 focus:outline-none"
                style={{
                    fontFamily: fontFamily,
                    fontSize: fontSize + "px",
                    lineHeight: "1.5",
                    minHeight: minHeight,
                }}
                suppressContentEditableWarning={true}
                onInput={() => {
                    if (onChange) {
                        const userContent = editorRef.current?.innerHTML || ""
                        onChange(userContent + quotedHtml)
                    }
                }}
                data-placeholder={placeholder}
            />

            {(mode === 'reply' || mode === 'forward') && quotedHtml && (
                <div className="">
                    {!isQuotedContentExpanded && mode === 'reply' ? (
                        <button 
                            type="button" 
                            onClick={() => setIsQuotedContentExpanded(true)} 
                            className="flex items-center text-gray-500 hover:bg-gray-200 rounded-full p-2"
                            aria-label="Show quoted text"
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </button>
                    ) : (
                        <div
                            className="border-l-2 border-gray-300 pl-3 text-sm text-gray-600"
                            dangerouslySetInnerHTML={{ __html: quotedHtml }} 
                        />
                    )}
                </div>
            )}
        </div>
      </div>
    )
  },
)

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor