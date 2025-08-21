// components/mail/Composer.tsx
"use client";

import { useComposerStore } from "@/lib/store/composer";
import { usePathname, useRouter } from 'next/navigation'; // Import router hooks
import MiniComposer from "../mini-composer";
import MainComposer from "../main-composer";

export function Composer() {
  const router = useRouter();
  const pathname = usePathname();

  // Subscribe to the entire store to get both state and actions
  const {
    draftId,
    setDraftId,
    isOpen,
    isMaximized,
    closeComposer: storeCloseComposer, // Rename to avoid conflict
    toggleMaximize,
    toggleMinimize,
    // ... all other state properties you pass down
    replyToMessage,
    forwardMessage,
    composerData,
    composerAttachments,
    updateComposerData,
  } = useComposerStore();

  // --- NEW URL CLEANUP LOGIC ---
  const handleClose = () => {
    // First, call the original store action to update the client state
    storeCloseComposer();

    // Then, clean the 'compose' parameter from the URL
    const params = new URLSearchParams(window.location.search);
    params.delete('compose');
    const queryString = params.toString();
    
    // Use router.replace to update the URL without adding to browser history
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`);
  };
  
  
  const handleDraftCreated = (newDraftId: string) => {
    // This now just calls the store's setter
    setDraftId(newDraftId);
    
    const params = new URLSearchParams(window.location.search);
    params.set('compose', newDraftId);
    router.replace(`${pathname}?${params.toString()}`);
  };
  
  // This is the key change: pass the `draftId` from the store
  // and the `handleDraftCreated` function (which now acts as `setDraftId`)
  // down to the active composer.

  if (isOpen) {
    return (
      <MiniComposer
        isOpen={true}
        onClose={handleClose}
        onMaximize={toggleMaximize}
        draftId={draftId} // <-- PASS DRAFT ID
        onDraftCreated={handleDraftCreated} // <-- PASS SETTER
        // ... other props
        replyToMessage={replyToMessage}
        forwardMessage={forwardMessage}
        initialData={composerData}
        initialAttachments={composerAttachments}
        onDataChange={updateComposerData}
      />
    );
  }

  if (isMaximized) {
    return (
      <MainComposer
        isOpen={true}
        onClose={handleClose}
        onMinimize={toggleMinimize}
        draftId={draftId} // <-- PASS DRAFT ID
        onDraftCreated={handleDraftCreated} // <-- PASS SETTER
        // ... other props
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