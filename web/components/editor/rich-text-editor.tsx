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
const FONT_FAMILIES = ["Arial", "Helvetica", "Times New Roman", "Courier New", "Verdana", "Georgia", "Palatino", "Garamond", "Bookman", "Comic Sans MS", "Trebuchet MS", "Arial Black"]
const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "22", "24", "26", "28", "36", "48", "72"]
const COLORS = ["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff", "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"]

// --- COMPONENT PROPS AND REF ---
interface RichTextEditorProps {
  placeholder?: string
  className?: string
  initialContent?: string
  onChange?: (content: string) => void
  minHeight?: string
  mode?: "compose" | "reply" | "forward"
  isToolbarVisible?: boolean
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
      placeholder = "",
      className = "",
      initialContent = "",
      onChange,
      minHeight = "100px",
      mode = "compose",
      isToolbarVisible = false
    },
    ref,
  ) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const lastContentRef = useRef<string>(""); // Keep track of the last emitted content
    const [fontSize, setFontSize] = useState("12")
    const [fontFamily, setFontFamily] = useState("Arial")
    const [quotedHtml, setQuotedHtml] = useState("")

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
      getContent: () => editorRef.current?.innerHTML || "",
      setContent: (content: string) => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
          editorRef.current.innerHTML = content;
          lastContentRef.current = content;
        }
      },
      focus: () => {
        editorRef.current?.focus();
        // Move cursor to the end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      },
    }));

    useEffect(() => {
        if (editorRef.current && initialContent) {
            editorRef.current.innerHTML = initialContent;
            lastContentRef.current = initialContent;
        }
    }, [initialContent]);

    const executeCommand = useCallback((command: string, value?: string) => {
      document.execCommand(command, false, value)
      editorRef.current?.focus()
      handleContentChange(); // Reflect changes immediately
    }, [])

    const handleContentChange = () => {
        if (!onChange || !editorRef.current) return;
        const currentContent = editorRef.current.innerHTML;
        if (currentContent !== lastContentRef.current) {
            lastContentRef.current = currentContent;
            onChange(currentContent);
        }
    };
    


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
      <div className={`relative border rounded-lg bg-white overflow-hidden flex flex-col ${className}`}>
        {/* Editing Area and Quoted Content */}
        <div className="flex-grow overflow-y-auto">
          <div
            ref={editorRef}
            contentEditable
            className="p-3 focus:outline-none w-full h-full"
            style={{ minHeight, fontFamily, fontSize: `${fontSize}px` }}
            suppressContentEditableWarning={true}
            onInput={handleContentChange} // CRITICAL FIX: Use onInput to detect changes
            data-placeholder={placeholder}
          />
        </div>

        {/* Floating Toolbar */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-transform duration-300 ease-in-out ${isToolbarVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
        >
          <div className="border-t p-2 bg-gray-50 flex flex-wrap items-center gap-1">
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("undo")} className="h-7 w-7 p-0"><Undo className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("redo")} className="h-7 w-7 p-0"><Redo className="h-3 w-3" /></Button>
            <Separator orientation="vertical" className="h-5 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type='button' variant="ghost" size="sm" className="h-7 min-w-[80px] justify-between text-xs">{fontFamily}<Type className="h-3 w-3 ml-1" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-60 overflow-y-auto">
                {FONT_FAMILIES.map((font) => <DropdownMenuItem key={font} onClick={() => changeFontFamily(font)} style={{ fontFamily: font }}>{font}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type='button' variant="ghost" size="sm" className="h-7 w-10 justify-center text-xs">{fontSize}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {FONT_SIZES.map((size) => <DropdownMenuItem key={size} onClick={() => changeFontSize(size)}>{size}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("bold")} className="h-7 w-7 p-0"><Bold className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("italic")} className="h-7 w-7 p-0"><Italic className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("underline")} className="h-7 w-7 p-0"><Underline className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("strikeThrough")} className="h-7 w-7 p-0"><Strikethrough className="h-3 w-3" /></Button>

            <Popover>
              <PopoverTrigger asChild><Button type='button' variant="ghost" size="sm" className="h-7 w-7 p-0"><Palette className="h-3 w-3" /></Button></PopoverTrigger>
              <PopoverContent className="w-64 p-2"><div className="grid grid-cols-10 gap-1">{COLORS.map((color) => (<Button type='button' key={color} className="w-5 h-5 rounded border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => executeCommand("foreColor", color)} />))}</div></PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild><Button type='button' variant="ghost" size="sm" className="h-7 w-7 p-0"><Highlighter className="h-3 w-3" /></Button></PopoverTrigger>
              <PopoverContent className="w-64 p-2"><div className="grid grid-cols-10 gap-1">{COLORS.map((color) => (<Button type='button' key={color} className="w-5 h-5 rounded border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => executeCommand("backColor", color)} />))}</div></PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("justifyLeft")} className="h-7 w-7 p-0"><AlignLeft className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("justifyCenter")} className="h-7 w-7 p-0"><AlignCenter className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("justifyRight")} className="h-7 w-7 p-0"><AlignRight className="h-3 w-3" /></Button>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("insertUnorderedList")} className="h-7 w-7 p-0"><List className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("insertOrderedList")} className="h-7 w-7 p-0"><ListOrdered className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("outdent")} className="h-7 w-7 p-0"><Outdent className="h-3 w-3" /></Button>
            <Button type='button' variant="ghost" size="sm" onClick={() => executeCommand("indent")} className="h-7 w-7 p-0"><Indent className="h-3 w-3" /></Button>

            <Separator orientation="vertical" className="h-5 mx-1" />
            <Button type='button' variant="ghost" size="sm" onClick={insertLink} className="h-7 w-7 p-0"><LinkIcon className="h-3 w-3" /></Button>
          </div>
        </div>
      </div>
    )
  },
)

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor