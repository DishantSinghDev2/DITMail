"use client"

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bold, Italic, Underline, AlignLeft, List, LinkIcon, Undo, Redo, Type, Palette, MoreHorizontal } from "lucide-react"

// Constants remain the same
const FONT_FAMILIES = [ "Arial", "Helvetica", "Times New Roman", "Courier New", "Verdana", "Georgia", "Palatino", "Garamond", "Bookman", "Comic Sans MS", "Trebuchet MS", "Arial Black"]
const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "22", "24", "26", "28", "36", "48", "72"]
const COLORS = [ "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff", "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"]

interface RichTextEditorProps {
  placeholder?: string
  className?: string
  initialContent?: string
  onChange?: (content: string) => void
  minHeight?: string
  maxHeight?: string
  mode?: "compose" | "reply" | "forward"
}

export interface RichTextEditorRef {
  getContent: () => string
  setContent: (content: string) => void
  focus: () => void
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      placeholder = "Compose your message...",
      className = "",
      initialContent = "",
      onChange,
      minHeight = "100px", // Adjusted for a better default reply view
      maxHeight = "400px",
      mode = "compose"
    },
    ref,
  ) => {
    const editorRef = useRef<HTMLDivElement>(null) // Ref for the user's typing area
    const [fontSize, setFontSize] = useState("12")
    const [fontFamily, setFontFamily] = useState("Arial")
    
    // --- NEW STATE FOR MANAGING QUOTED CONTENT ---
    const [quotedHtml, setQuotedHtml] = useState("")
    const [isQuotedContentExpanded, setIsQuotedContentExpanded] = useState(mode === "forward") // Always expanded for forward

    // Splits the incoming HTML into user content and quoted content
    const processContent = useCallback((content: string) => {
        if (mode === "reply" && content.includes("<blockquote")) {
            const parts = content.split(/<blockquote.*?>/)
            const userContent = parts[0] || "<p><br></p>" // Ensure there's always a writable area
            const quote = content.substring(userContent.length)
            setQuotedHtml(quote)
            return userContent
        }
        return content
    }, [mode])
    
    // --- REFACTORED IMPERATIVE HANDLE ---
    useImperativeHandle(ref, () => ({
      getContent: () => {
        const userContent = editorRef.current?.innerHTML || ""
        // Re-combine user content and the original quote to get the full email body
        return userContent + (quotedHtml || "")
      },
      setContent: (content: string) => {
        if (editorRef.current) {
          const userContent = processContent(content)
          editorRef.current.innerHTML = userContent
          // We don't call onChange here as it would be redundant
        }
      },
      focus: () => editorRef.current?.focus(),
    }))

    const executeCommand = useCallback(
      (command: string, value?: string) => {
        document.execCommand(command, false, value)
        editorRef.current?.focus()
        if (onChange) {
            const userContent = editorRef.current?.innerHTML || ""
            onChange(userContent + quotedHtml)
        }
      },
      [onChange, quotedHtml],
    )
    
    // --- REFACTORED INITIALIZATION ---
    useEffect(() => {
        const editor = editorRef.current
        if (editor && initialContent) {
            const userContent = processContent(initialContent)
            editor.innerHTML = userContent
        }
    }, [initialContent, processContent])


    // (Paste/Copy/Other handlers remain the same but now only fire onChange with combined content)
    const handlePaste = useCallback((e: ClipboardEvent) => {
        e.preventDefault()
        const textData = e.clipboardData?.getData("text/plain") || ""
        document.execCommand("insertText", false, textData)
        if (onChange) {
            const userContent = editorRef.current?.innerHTML || ""
            onChange(userContent + quotedHtml)
        }
    }, [onChange, quotedHtml])

    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return
        editor.addEventListener("paste", handlePaste)
        return () => editor.removeEventListener("paste", handlePaste)
    }, [handlePaste])


    // (Font/Style change functions remain the same)
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


    // --- RESTRUCTURED JSX ---
    return (
      <div className={`border rounded-lg bg-white overflow-hidden flex flex-col ${className}`}>
        {/* Toolbar */}
        <div className="border-b p-2 bg-gray-50 flex flex-wrap items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => executeCommand("undo")} className="h-7 w-7 p-0">
            <Undo className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("redo")} className="h-7 w-7 p-0">
            <Redo className="h-3 w-3" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Font Family Dropdown */}
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
          
          {/* Font Size Dropdown */}
          <DropdownMenu>
             <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-10 justify-center text-xs">{fontSize}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {FONT_SIZES.map((size) => <DropdownMenuItem key={size} onClick={() => changeFontSize(size)}>{size}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Style Buttons */}
          <Button variant="ghost" size="sm" onClick={() => executeCommand("bold")} className="h-7 w-7 p-0"><Bold className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("italic")} className="h-7 w-7 p-0"><Italic className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("underline")} className="h-7 w-7 p-0"><Underline className="h-3 w-3" /></Button>
          
          {/* Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Palette className="h-3 w-3" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-64"><div className="grid grid-cols-10 gap-1">{COLORS.map((color) => (<button key={color} className="w-5 h-5 rounded border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => executeCommand("foreColor", color)}/>))}</div></PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" onClick={() => executeCommand("justifyLeft")} className="h-7 w-7 p-0"><AlignLeft className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => executeCommand("insertUnorderedList")} className="h-7 w-7 p-0"><List className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={insertLink} className="h-7 w-7 p-0"><LinkIcon className="h-3 w-3" /></Button>
        </div>

        {/* --- ALWAYS-ON EDITING AREA --- */}
        <div className="flex-grow overflow-y-auto ditmail-scrollbar">
            <div
                ref={editorRef}
                contentEditable
                className="p-3 focus:outline-none"
                style={{
                    fontFamily: fontFamily,
                    fontSize: fontSize + "px",
                    lineHeight: "1.4",
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

            {/* --- SEPARATE QUOTED CONTENT AREA --- */}
            {mode === 'reply' && quotedHtml && (
                <div className="px-3 pb-3">
                    {!isQuotedContentExpanded ? (
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
                            // The quoted content is rendered but not editable
                            dangerouslySetInnerHTML={{ __html: quotedHtml }} 
                        />
                    )}
                </div>
            )}
            
            {/* Forward mode just shows the content directly */}
            {mode === 'forward' && (
                <div 
                    className="p-3"
                    dangerouslySetInnerHTML={{__html: quotedHtml}}
                />
            )}
        </div>
      </div>
    )
  },
)

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor