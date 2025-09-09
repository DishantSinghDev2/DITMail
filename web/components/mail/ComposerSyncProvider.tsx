"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useComposerStore } from '@/lib/store/composer';

async function fetchDraft(draftId: string) {
    const res = await fetch(`/api/drafts/${draftId}`);
    if (!res.ok) throw new Error("Draft not found");
    const { draft } = await res.json();
    return draft;
}

export function ComposerSyncProvider({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    // Subscribe to all state values needed for the logic
    const { isOpen, isMaximized, draftId, openComposer, reopenComposer, closeComposer } = useComposerStore();

    useEffect(() => {
        const composeParam = searchParams.get('compose');
        const isComposerOpenInUI = isOpen || isMaximized;

        const syncStateWithUrl = async () => {
            if (composeParam) {
                // --- START OF THE FIX ---
                // This is the critical condition to identify the "first save" transition.
                // If the composer is open and its internal state has no draftId yet,
                // but the URL has just received an ID, we must ignore the sync.
                // This allows the client-side state (what the user is typing) to persist
                // without being overwritten by a pointless fetch.
                if (isComposerOpenInUI && !draftId && composeParam !== 'new') {
                    return; // Do nothing, let the client-side state update handle the new ID.
                }
                // --- END OF THE FIX ---

                // Condition 1: Composer IS open, but the URL points to a DIFFERENT draft.
                // This handles navigating between drafts using browser back/forward buttons.
                if (isComposerOpenInUI && draftId && draftId !== composeParam) {
                     if (composeParam === 'new') {
                        reopenComposer({}); // Reset to a new composer state
                     } else {
                        try {
                            const draft = await fetchDraft(composeParam);
                            const composerPayload = {
                                draftId: draft._id,
                                initialData: { to: draft.to?.join(', ') || '', cc: draft.cc?.join(', ') || '', bcc: draft.bcc?.join(', ') || '', subject: draft.subject || '', content: draft.html || '', attachments: [] },
                                initialAttachments: draft.attachments || []
                            };
                            reopenComposer(composerPayload);
                        } catch (error) {
                            console.error("Failed to switch draft from URL:", error);
                        }
                     }
                }
                // Condition 2: Composer is NOT open. Load it from the URL.
                // This handles opening a draft from a link or reloading the page.
                else if (!isComposerOpenInUI) {
                    if (composeParam === 'new') {
                        openComposer({});
                    } else {
                        try {
                            const draft = await fetchDraft(composeParam);
                            const composerPayload = {
                                draftId: draft._id,
                                initialData: { to: draft.to?.join(', ') || '', cc: draft.cc?.join(', ') || '', bcc: draft.bcc?.join(', ') || '', subject: draft.subject || '', content: draft.html || '', attachments: [] },
                                initialAttachments: draft.attachments || []
                            };
                            openComposer(composerPayload);
                        } catch (error) {
                            console.error("Failed to load draft from URL:", error);
                        }
                    }
                }
            } else {
                // If there's no 'compose' param in the URL, make sure the composer is closed.
                if (isComposerOpenInUI) {
                    closeComposer();
                }
            }
        };

        syncStateWithUrl();
    }, [searchParams, draftId, isMaximized, isOpen, openComposer, reopenComposer, closeComposer]);

    return <>{children}</>;
}