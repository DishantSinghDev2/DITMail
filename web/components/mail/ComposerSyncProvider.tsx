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
    const { isOpen, isMaximized, draftId, openComposer, reopenComposer, closeComposer } = useComposerStore();

    useEffect(() => {
        const composeParam = searchParams.get('compose');
        const isComposerOpenInUI = isOpen || isMaximized;

        const syncStateWithUrl = async () => {
            if (composeParam) {
                // Condition 1: Composer is NOT open. Load it from URL.
                // This handles opening a draft link or reloading the page.
                if (!isComposerOpenInUI) {
                    if (composeParam === 'new') {
                        openComposer({});
                    } else {
                        try {
                            const draft = await fetchDraft(composeParam);
                            const composerPayload = { draftId: draft._id, initialData: { to: draft.to?.join(', ') || '', cc: draft.cc?.join(', ') || '', bcc: draft.bcc?.join(', ') || '', subject: draft.subject || '', content: draft.html || '', attachments: draft.attachments?.map((a: any) => a._id) || [] }, initialAttachments: draft.attachments || [] };
                            openComposer(composerPayload);
                        } catch (error) {
                            console.error("Failed to load draft from URL:", error);
                        }
                    }
                }
                // Condition 2: Composer IS open, but the URL points to a DIFFERENT draft.
                // This handles navigating between drafts using browser back/forward.
                else if (isComposerOpenInUI && draftId && draftId !== composeParam) {
                     if (composeParam === 'new') {
                        reopenComposer({}); // Reset to a new composer state
                     } else {
                        try {
                            const draft = await fetchDraft(composeParam);
                            const composerPayload = { draftId: draft._id, initialData: { to: draft.to?.join(', ') || '', cc: draft.cc?.join(', ') || '', bcc: draft.bcc?.join(', ') || '', subject: draft.subject || '', content: draft.html || '', attachments: draft.attachments?.map((a: any) => a._id) || [] }, initialAttachments: draft.attachments || [] };
                            reopenComposer(composerPayload);
                        } catch (error) {
                            console.error("Failed to switch draft from URL:", error);
                        }
                     }
                }
                // NOTE: The case where the composer is open, draftId is undefined, and
                // composeParam gets an ID is now IGNORED. This is the "new draft created"
                // transition, and we let the client-side state remain untouched to prevent a refresh.

            } else {
                // If there's no compose param in the URL, make sure the composer is closed.
                if (isComposerOpenInUI) {
                    closeComposer();
                }
            }
        };

        syncStateWithUrl();
    }, [searchParams, draftId, isMaximized, isOpen, openComposer, reopenComposer, closeComposer]);

    return <>{children}</>;
}