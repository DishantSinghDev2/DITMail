// Example: components/tiptap/tiptap-ui/ad-placeholder-popover.tsx
// (Assuming this is where your React components reside)

import * as React from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { CornerDownLeftIcon, DollarSign, Plus, Trash } from "lucide-react"
// Use a more appropriate icon for closing/cancelling
import { XIcon } from "lucide-react" // Or Cross, Ban etc.

// --- UI Primitives ---
import { Button } from "@/components/tiptap/tiptap-ui-primitive/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/tiptap/tiptap-ui-primitive/popover"
import { Separator } from "@/components/tiptap/tiptap-ui-primitive/separator"

// --- Styles ---
import "@/components/tiptap/tiptap-ui/ad-placeholder-button/ad-placeholder-popover.scss" // Your styles

// --- AdPlaceholderAttributes Type (can be imported from extension file if setup allows) ---
interface AdPlaceholderAttributes {
    adSlotId: string | null;
}

// --- Utility Functions ---

/**
 * Checks if the AdPlaceholder extension is registered with the editor.
 * Logs a warning if not found.
 */
export function checkAdPlaceholderExtension(editor: Editor | null): boolean {
    if (!editor) return false
    // Ensure the name matches the extension's name property
    const hasExtension = editor.extensionManager.extensions.some(
        (extension) => extension.name === "adPlaceholder"
    )
    if (!hasExtension) {
        console.warn(
            "AdPlaceholder extension is not available. " +
            "Make sure it is included in your editor configuration."
        )
    }
    return hasExtension
}

/**
 * Checks if the editor can currently insert an ad placeholder.
 */
export function canSetAdPlaceholder(editor: Editor | null, adPlaceholderAvailable: boolean): boolean {
    if (!editor || !adPlaceholderAvailable) return false
    try {
        // Check if the command exists and can be executed
        return !!editor.commands.setAdPlaceholder && editor.can().setAdPlaceholder({ adSlotId: 'test' }) // Pass dummy attrs for check
    } catch (e) {
        // Catch potential errors if command structure changes or is invalid
        console.error("Error checking canSetAdPlaceholder:", e);
        return false
    }
}

// --- AdPlaceholder Handler Hook ---

export interface AdPlaceholderHandlerProps {
    editor: Editor | null
    /** Callback executed after the ad placeholder is successfully set. */
    onSetAdPlaceholder?: () => void
}

export const useAdPlaceholderHandler = (props: AdPlaceholderHandlerProps) => {
    const { editor, onSetAdPlaceholder } = props

    const adPlaceholderAvailable = React.useMemo(() => checkAdPlaceholderExtension(editor), [editor])
    // Check if insertion is generally possible (might need refinement based on selection)
    const canInsert = React.useMemo(() => canSetAdPlaceholder(editor, adPlaceholderAvailable), [editor, adPlaceholderAvailable])

    // Updated setAdPlaceholder to accept attributes
    const setAdPlaceholder = React.useCallback((attributes: Partial<AdPlaceholderAttributes>) => {
        if (!editor || !adPlaceholderAvailable || !canInsert || !attributes.adSlotId) {
            // Add a check for required attributes like adSlotId
            alert("Please provide an Ad Slot ID.");
            return;
        }

        try {
            editor.chain().focus().setAdPlaceholder(attributes).run()
            onSetAdPlaceholder?.() // Call the callback (e.g., to close the popover)
        } catch (error) {
            console.error("Error inserting ad placeholder:", error)
            alert("Failed to insert ad placeholder.")
        }
    }, [editor, adPlaceholderAvailable, canInsert, onSetAdPlaceholder])

    // removeAdPlaceholder might be better handled via editor commands directly
    // or a node view attached to the placeholder itself. Removing it from the insert popover.

    return {
        setAdPlaceholder, // Now accepts attributes
        canInsert,
        adPlaceholderAvailable,
    }
}

// --- AdPlaceholder Button Component ---

export const AdPlaceholderButton = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
    ({ className, children, ...props }, ref) => {
        return (
            <Button
                type="button"
                className={className}
                data-style="ghost"
                role="button"
                tabIndex={-1}
                aria-label="Insert Ad Placeholder"
                tooltip="Insert Ad Placeholder"
                ref={ref}
                {...props}
            >
                {children || <DollarSign className="tiptap-button-icon" />} <span className="text-sm ml-1">Ad</span>
            </Button>
        )
    }
)
AdPlaceholderButton.displayName = "AdPlaceholderButton"

// --- AdPlaceholder Main Content Component (Inside Popover) ---

// Updated props to accept the function that takes attributes
export interface AdPlaceholderMainProps {
    setAdPlaceholder: (attrs: Partial<AdPlaceholderAttributes>) => void;
    /** Function to close the parent popover. */
    closePopover: () => void;
}

const AdPlaceholderMain: React.FC<AdPlaceholderMainProps> = ({
    setAdPlaceholder,
    closePopover,
}) => {
    const [adSlotIdInput, setAdSlotIdInput] = React.useState<string>('');

    const handleInsert = () => {
        if (!adSlotIdInput.trim()) {
            alert("Ad Slot ID cannot be empty.");
            return;
        }
        setAdPlaceholder({ adSlotId: adSlotIdInput.trim() });
        // Optionally clear input after insert if popover stays open for some reason
        // setAdSlotIdInput('');
        // Popover closing is handled by the onSetAdPlaceholder callback in the hook
    };

    // Handle Enter key press in the input field
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if it's in a form
            handleInsert();
        }
    };

    return (
        <>
            <input
                id="adSlotIdInput"
                type="text"
                value={adSlotIdInput}
                onChange={(e) => setAdSlotIdInput(e.target.value)}
                onKeyDown={handleKeyDown} // Add Enter key handler
                placeholder="e.g., /123456/my_ad_unit"
                className="tiptap-input tiptap-input-clamp" // Add specific class if needed
                autoFocus // Focus the input when the popover opens
            />


            <div className="tiptap-button-group" data-orientation="horizontal">
                {/* Insert Button */}
                <Button
                    type="button"
                    onClick={handleInsert}
                    title="Insert Ad Placeholder"
                    // data-style="primary" // Optional: Make insert button more prominent
                    disabled={!adSlotIdInput.trim()} // Disable if input is empty
                    data-style="ghost"
                >
                    <CornerDownLeftIcon className="tiptap-button-icon" />
                </Button>

                <Separator className="tiptap-separator" />
                {/* Cancel Button */}
            </div>

            <div className="tiptap-button-group" data-orientation="horizontal">
                <Button
                    type="button"
                    onClick={closePopover}
                    title="Cancel"
                    data-style="ghost"
                    className="tiptap-popover-cancel-button"
                >
                    <Trash className="tiptap-button-icon" /> {/* Use X or similar for cancel */}
                </Button>


            </div>
        </>
    )
}


// --- AdPlaceholder Popover Component ---

export interface AdPlaceholderPopoverProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, "type"> {
    editor?: Editor | null
    hideWhenUnavailable?: boolean
    onOpenChange?: (isOpen: boolean) => void
}

export function AdPlaceholderPopover({
    editor: providedEditor,
    hideWhenUnavailable = false,
    onOpenChange,
    ...props
}: AdPlaceholderPopoverProps) {
    const editor = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = React.useState(false)

    // Callback passed to useAdPlaceholderHandler to close popover on success
    const handleSetSuccess = () => {
        setIsOpen(false); // Close popover on successful insertion
    }

    const {
        setAdPlaceholder, // This function now expects attributes
        canInsert,
        adPlaceholderAvailable
    } = useAdPlaceholderHandler({
        editor,
        onSetAdPlaceholder: handleSetSuccess, // Pass the success handler
    })

    const isTriggerDisabled = React.useMemo(() => {
        return !editor || !adPlaceholderAvailable || !canInsert
    }, [editor, adPlaceholderAvailable, canInsert])

    const shouldShow = React.useMemo(() => {
        if (!editor?.isEditable) return false
        if (!adPlaceholderAvailable) return false
        if (hideWhenUnavailable && !canInsert) return false
        return true
    }, [editor, adPlaceholderAvailable, canInsert, hideWhenUnavailable])

    const handleOnOpenChange = React.useCallback(
        (nextIsOpen: boolean) => {
            setIsOpen(nextIsOpen)
            onOpenChange?.(nextIsOpen)
            // Optionally focus editor when closing
            if (!nextIsOpen) {
                editor?.chain().focus().run();
            }
        },
        [onOpenChange, editor]
    )

    if (!shouldShow) {
        return null
    }

    return (
        <Popover open={isOpen} onOpenChange={handleOnOpenChange}>
            <PopoverTrigger asChild>
                <AdPlaceholderButton
                    disabled={isTriggerDisabled}
                    data-disabled={isTriggerDisabled}
                    {...props}
                />
            </PopoverTrigger>

            {/* Use sideOffset etc. for positioning if needed */}
            <PopoverContent className="tiptap-ad-placeholder-popover">
                {/* Pass the updated setAdPlaceholder function */}
                <AdPlaceholderMain
                    setAdPlaceholder={setAdPlaceholder} // Pass the function from the hook
                    closePopover={() => handleOnOpenChange(false)}
                />
            </PopoverContent>
        </Popover>
    )
}

// --- AdPlaceholderContent Component (if used standalone) ---
// This component seems less useful now that the logic is inside the popover,
// but if you need it elsewhere:
export const AdPlaceholderContent: React.FC<{
    editor?: Editor | null
}> = ({ editor: providedEditor }) => {
    const editor = useTiptapEditor(providedEditor)

    const { setAdPlaceholder } = useAdPlaceholderHandler({
        editor: editor,
    });

    return (
        <AdPlaceholderMain
            setAdPlaceholder={setAdPlaceholder} // Pass the function from the hook
            closePopover={() => { }} // Dummy close function
        />
    );
}