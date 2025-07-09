import * as React from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor" // Assuming this correctly provides the editor

// --- Icons ---
import { CodeXml } from "lucide-react" // Using lucide-react directly as per original
import { CornerDownLeftIcon } from "@/components/tiptap/tiptap-icons/corner-down-left-icon"
import { TrashIcon } from "@/components/tiptap/tiptap-icons/trash-icon" // Using Trash for consistency with link popover's 'remove' idea, though it just closes here

// --- UI Primitives ---
import { Button, ButtonProps } from "@/components/tiptap/tiptap-ui-primitive/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/tiptap/tiptap-ui-primitive/popover"
import { Separator } from "@/components/tiptap/tiptap-ui-primitive/separator"

// --- Styles ---
// Assuming similar styling exists or can be added for embed popover
import "@/components/tiptap/tiptap-ui/embed-button/embed-popover.scss" // Example path

// --- Utility Functions ---

/**
 * Checks if the Iframe extension is registered with the editor.
 * Logs a warning if not found.
 */
export function checkIframeExtension(editor: Editor | null): boolean {
    if (!editor) return false

    const hasExtension = editor.extensionManager.extensions.some(
        (extension) => extension.name === "iframe"
    )

    if (!hasExtension) {
        console.warn(
            "Iframe extension is not available. " +
            "Make sure it is included in your editor configuration."
        )
    }

    return hasExtension
}

/**
 * Checks if the editor can currently insert an iframe.
 */
export function canSetIframe(editor: Editor | null, iframeAvailable: boolean): boolean {
    if (!editor || !iframeAvailable) return false

    // Use a try-catch as editor.can() might throw if the command doesn't exist
    try {
        // Check if the command exists and can be executed in the current context
        return !!editor.commands.setIframe && editor.can().setIframe({ src: "" })
    } catch {
        return false
    }
}

// --- Embed Handler Hook ---

export interface EmbedHandlerProps {
    editor: Editor | null
    /** Callback executed after the embed is successfully set. */
    onSetEmbed?: () => void
}

export const useEmbedHandler = (props: EmbedHandlerProps) => {
    const { editor, onSetEmbed } = props
    const [url, setUrl] = React.useState<string>("")

    const iframeAvailable = React.useMemo(() => checkIframeExtension(editor), [editor])
    const canEmbed = React.useMemo(() => canSetIframe(editor, iframeAvailable), [editor, iframeAvailable])

    const setEmbed = React.useCallback(() => {
        if (!url || !editor || !iframeAvailable || !canEmbed) return

        try {
            // Basic URL validation (consider a more robust library if needed)
            new URL(url)
            if (url.includes("youtube.com") || url.includes("youtu.be")) {
                let youtubeEmbedUrl = url.replace("watch?v=", "embed/");
                if (youtubeEmbedUrl.includes("youtu.be")) {
                    youtubeEmbedUrl = youtubeEmbedUrl.replace("youtu.be", "youtube.com/embed");
                }
                editor.chain().focus().setIframe({ src: youtubeEmbedUrl }).run();
            } else {
                editor.chain().focus().setIframe({ src: url }).run();
            }            
            setUrl("") // Clear input after successful embed
            onSetEmbed?.() // Call the callback (e.g., to close the popover)
        } catch (error) {
            console.error("Invalid URL provided for embedding:", error)
            // Optionally provide user feedback here (e.g., using a toast notification)
            alert("Invalid URL. Please enter a valid URL.")
        }
    }, [editor, url, iframeAvailable, canEmbed, onSetEmbed])

    // No 'removeEmbed' equivalent to 'removeLink' as embedding is usually an insertion.
    // Closing the popover serves as the cancellation action.

    // No equivalent 'isActive' state needed like for links, as embedding is an action, not a state of selected text.

    return {
        url,
        setUrl,
        setEmbed,
        canEmbed,
        iframeAvailable,
    }
}

// --- Embed Button Component ---

export const EmbedButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <Button
                type="button"
                className={className}
                data-style="ghost" // Use consistent styling
                role="button"
                tabIndex={-1} // Usually managed by PopoverTrigger
                aria-label="Embed Content"
                tooltip="Embed Content"
                ref={ref}
                {...props}
            >
                {children || <CodeXml className="tiptap-button-icon" />} <span className="text-sm ml-1">Embed</span>
            </Button>
        )
    }
)
EmbedButton.displayName = "EmbedButton"

// --- Embed Main Content Component ---

export const EmbedContent: React.FC<{
    editor?: Editor | null
}> = ({ editor: providedEditor }) => {
    const editor = useTiptapEditor(providedEditor)

    const embedHandler = useEmbedHandler({
        editor: editor,
    })

    return (
        <EmbedMain
            url={embedHandler.url}
            setUrl={embedHandler.setUrl}
            setEmbed={embedHandler.setEmbed}
            closePopover={() => {}}
        />
    )
}

export interface EmbedMainProps {
    url: string
    setUrl: React.Dispatch<React.SetStateAction<string>>
    setEmbed: () => void
    /** Function to close the parent popover. */
    closePopover: () => void
}

const EmbedMain: React.FC<EmbedMainProps> = ({
    url,
    setUrl,
    setEmbed,
    closePopover,
}) => {
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            event.preventDefault()
            setEmbed()
        }
        if (event.key === "Escape") {
            event.preventDefault()
            closePopover()
        }
    }

    return (
        // Add a wrapper div if specific styling is needed, like in link-popover.scss
        <>
            <input
                type="url"
                placeholder="Enter URL to embed..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                className="tiptap-input tiptap-input-clamp" // Use consistent input styling
            />

            <div className="tiptap-button-group" data-orientation="horizontal">
                <Button
                    type="button"
                    onClick={setEmbed}
                    title="Embed URL"
                    disabled={!url} // Only disable if URL is empty
                    data-style="ghost"
                >
                    <CornerDownLeftIcon className="tiptap-button-icon" />
                </Button>
            </div>

            <Separator />

            {/* Using a TrashIcon like the link popover for 'cancel/close' action */}
            <div className="tiptap-button-group" data-orientation="horizontal">
                <Button
                    type="button"
                    onClick={closePopover}
                    title="Cancel"
                    data-style="ghost"
                >
                    {/* Use TrashIcon for consistency or Cross/Plus if preferred */}
                    <TrashIcon className="tiptap-button-icon" />
                    {/* <Plus className="tiptap-button-icon rotate-45" /> */}
                    {/* <Cross className="tiptap-button-icon" /> */}
                </Button>
            </div>
        </>
    )
}

// --- Embed Popover Component ---

export interface EmbedPopoverProps extends Omit<ButtonProps, "type"> {
    /** The TipTap editor instance. */
    editor?: Editor | null
    /**
     * Whether to hide the embed button when embedding is not possible.
     * @default false
     */
    hideWhenUnavailable?: boolean
    /** Callback for when the popover opens or closes. */
    onOpenChange?: (isOpen: boolean) => void
}

export function EmbedPopover({
    editor: providedEditor,
    hideWhenUnavailable = false,
    onOpenChange,
    ...props // Pass remaining ButtonProps to EmbedButton
}: EmbedPopoverProps) {
    const editor = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = React.useState(false)

    // Callback passed to useEmbedHandler to close popover on success
    const onSetEmbed = () => {
        setIsOpen(false)
    }

    const {
        url,
        setUrl,
        setEmbed,
        canEmbed,
        iframeAvailable // Get availability status from hook
    } = useEmbedHandler({
        editor,
        onSetEmbed,
    })

    // Determine if the trigger button itself should be disabled
    const isTriggerDisabled = React.useMemo(() => {
        // Disabled if no editor, extension not available, or cannot embed in current context
        return !editor || !iframeAvailable || !canEmbed
    }, [editor, iframeAvailable, canEmbed])

    // Determine if the entire component should be rendered
    const shouldShow = React.useMemo(() => {
        if (!editor?.isEditable) return false // Don't show if editor isn't editable
        if (!iframeAvailable) return false // Don't show if extension isn't loaded
        if (hideWhenUnavailable && !canEmbed) return false // Hide if unavailable and prop is set
        return true
    }, [editor, iframeAvailable, canEmbed, hideWhenUnavailable])

    const handleOnOpenChange = React.useCallback(
        (nextIsOpen: boolean) => {
            setIsOpen(nextIsOpen)
            onOpenChange?.(nextIsOpen)
            // Optionally clear URL when popover is closed
            if (!nextIsOpen) {
                setUrl("")
            }
        },
        [onOpenChange, setUrl]
    )

    if (!shouldShow) {
        return null
    }

    return (
        <Popover open={isOpen} onOpenChange={handleOnOpenChange}>
            <PopoverTrigger asChild>
                <EmbedButton
                    disabled={isTriggerDisabled}
                    data-disabled={isTriggerDisabled}
                    // No active state needed for embed button
                    {...props} // Pass button props like variant, size, className
                />
            </PopoverTrigger>

            <PopoverContent>
                {/* Pass necessary state and functions to the content */}
                <EmbedMain
                    url={url}
                    setUrl={setUrl}
                    setEmbed={setEmbed}
                    closePopover={() => handleOnOpenChange(false)} // Provide function to close
                />
            </PopoverContent>
        </Popover>
    )
}
