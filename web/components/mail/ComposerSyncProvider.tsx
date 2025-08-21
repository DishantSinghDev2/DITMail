// components/mail/ComposerSyncProvider.tsx
"use client";

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useComposerStore } from '@/lib/store/composer';

// This is a client-side action to fetch draft data securely
async function fetchDraft(draftId: string) {
    // We can add a simple cache here to avoid re-fetching the same draft
    // if the user clicks back and forth quickly.
    const cached = sessionStorage.getItem(`draft_${draftId}`);
    if (cached) return JSON.parse(cached);

    const res = await fetch(`/api/drafts/${draftId}`);
    if (!res.ok) throw new Error("Draft not found");
    const { draft } = await res.json();

    // Cache the fetched draft for a short time in the session storage
    sessionStorage.setItem(`draft_${draftId}`, JSON.stringify(draft));
    return draft;
}

export function ComposerSyncProvider({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter(); // <-- Add router
    const pathname = usePathname(); // <-- Add pathname

    const store = useComposerStore();

    useEffect(() => {
        const composeParam = searchParams.get('compose');
        const { isOpen, isMaximized, draftId, openComposer, reopenComposer, closeComposer } = store;

        const isComposerOpenInUI = isOpen || isMaximized;

        const syncStateWithUrl = async () => {
            // SCENARIO 1: The URL wants a composer open.
            if (composeParam) {
                // CASE 1A: A composer is already open, but the ID in the URL is DIFFERENT.
                // This happens when switching from one draft to another.
                if (isComposerOpenInUI && draftId !== composeParam) {
                    try {
                        const draft = await fetchDraft(composeParam);
                        reopenComposer({ // Use the 'reopen' action to swap the data
                            draftId: draft._id,
                            initialData: { to: draft.to?.join(', ') || '', cc: draft.cc?.join(', ') || '', bcc: draft.bcc?.join(', ') || '', subject: draft.subject || '', content: draft.html || '' },
                            initialAttachments: draft.attachments || [],
                        });
                    } catch (error) { console.error("Failed to switch draft:", error); closeComposer(); }
                }
                // CASE 1B: The composer is completely closed. This is the initial open action.
                else if (!isComposerOpenInUI) {
                    if (composeParam === 'new') {
                        openComposer();
                    } else {
                        try {
                            const draft = await fetchDraft(composeParam);
                            openComposer({
                                draftId: draft._id,
                                initialData: { to: draft.to?.join(', ') || '', cc: draft.cc?.join(', ') || '', bcc: draft.bcc?.join(', ') || '', subject: draft.subject || '', content: draft.html || '' },
                                initialAttachments: draft.attachments || [],
                            });
                        } catch (error) { console.error("Failed to load draft from URL:", error); }
                    }
                }
                // CASE 1C: Composer is open and the ID matches. Do nothing. State is already correct.

            }
            // SCENARIO 2: The URL does NOT want a composer open.
            else {
                // If the composer is currently open in the UI, close it.
                if (isComposerOpenInUI) {
                    closeComposer();
                }
            }
        };

        syncStateWithUrl();
        // We ONLY want this effect to run when the URL search params change.
        // The store functions are stable and don't need to be dependencies.
    }, [searchParams]);

    return <>{children}</>;
}