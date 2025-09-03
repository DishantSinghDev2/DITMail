"use client";

import { useComposerStore } from "@/lib/store/composer";
import { usePathname, useRouter } from 'next/navigation';
import MiniComposer from "../mini-composer";
import MainComposer from "../main-composer";

export function Composer() {
  const router = useRouter();
  const pathname = usePathname();

  // Subscribe to all needed state and actions from the store
  const {
    draftId,
    isOpen,
    isMaximized,
    closeComposer: storeCloseComposer,
    toggleMaximize,
    toggleMinimize,
    replyToMessage,
    forwardMessage,
    composerData,
    composerAttachments,
    updateComposerData,
    setDraftId, // <-- Get the setter action from the store
  } = useComposerStore();

  // Handler for closing the composer, responsible for cleaning up the URL
  const handleClose = () => {
    storeCloseComposer();
    const params = new URLSearchParams(window.location.search);
    params.delete('compose');
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`);
  };

  // This function is called by the child composers ONLY when a NEW draft is created.
  const handleDraftCreated = (newDraftId: string) => {
    // 1. Update the central Zustand store with the new ID
    setDraftId(newDraftId);
    
    // 2. Update the URL without adding to browser history
    const params = new URLSearchParams(window.location.search);
    params.set('compose', newDraftId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Conditionally render the MiniComposer
  if (isOpen) {
    return (
      <MiniComposer
        isOpen={true}
        onClose={handleClose}
        onMaximize={toggleMaximize}
        draftId={draftId}
        onDraftCreated={handleDraftCreated}
        replyToMessage={replyToMessage}
        forwardMessage={forwardMessage}
        initialData={composerData}
        initialAttachments={composerAttachments}
        onDataChange={updateComposerData}
      />
    );
  }

  // Conditionally render the MainComposer
  if (isMaximized) {
    return (
      <MainComposer
        isOpen={true}
        onClose={handleClose}
        onMinimize={toggleMinimize}
        draftId={draftId}
        onDraftCreated={handleDraftCreated}
        replyToMessage={replyToMessage}
        forwardMessage={forwardMessage}
        initialData={composerData}
        initialAttachments={composerAttachments}
        onDataChange={updateComposerData}
      />
    );
  }

  return null;
}