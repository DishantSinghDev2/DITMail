"use client";

import { useComposerStore } from "@/lib/store/composer";
import MiniComposer from "../mini-composer"; // Adjust path if needed
import MainComposer from "../main-composer"; // Adjust path if needed

/**
 * Global Composer Component
 * This single component, placed in the layout, listens to the global composer store
 * and renders the appropriate composer (Mini or Main) when the state changes.
 * It's responsible for passing all data and callbacks between the store and the
 * UI components.
 */
export function Composer() {
  // --- Subscribe to the ENTIRE store ---
  const {
    isOpen,
    isMaximized,
    closeComposer,
    toggleMaximize,
    toggleMinimize,
    updateComposerData,
    replyToMessage,
    forwardMessage,
    composerData,
    composerAttachments,
  } = useComposerStore();

  // --- Render the correct composer based on the state ---
  
  // Render the MiniComposer if isOpen is true
  if (isOpen) {
    return (
      <MiniComposer
        isOpen={true}
        onClose={closeComposer}
        onMaximize={toggleMaximize}
        replyToMessage={replyToMessage}
        forwardMessage={forwardMessage}
        initialData={composerData}
        initialAttachments={composerAttachments}
        onDataChange={updateComposerData}
      />
    );
  }

  // Render the MainComposer if isMaximized is true
  if (isMaximized) {
    return (
      <MainComposer
        isOpen={true}
        onClose={closeComposer}
        onMinimize={toggleMinimize}
        replyToMessage={replyToMessage}
        forwardMessage={forwardMessage}
        initialData={composerData}
        initialAttachments={composerAttachments}
        onDataChange={updateComposerData}
      />
    );
  }

  // If neither is open, render nothing
  return null;
}
