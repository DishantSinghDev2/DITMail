// /components/mail/ComposerSyncProvider.tsx

"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useComposerStore } from '@/lib/store/composer';

// This is a client side action to fetch draft data securely from db :)
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
                if (!isComposerOpenInUI || (isComposerOpenInUI && draftId !== composeParam)) {
                    if (composeParam === 'new') {
                        openComposer({});
                    } else {
                        try {
                            const draft = await fetchDraft(composeParam);

                            const composerPayload = {
                                draftId: draft._id,
                                initialData: {
                                    to: draft.to?.join(', ') || '',
                                    cc: draft.cc?.join(', ') || '',
                                    bcc: draft.bcc?.join(', ') || '',
                                    subject: draft.subject || '',
                                    content: draft.html || '',
                                    attachments: draft.attachments?.map((a: any) => a._id) || []
                                },
                                initialAttachments: draft.attachments || [],
                            };

                            if (isComposerOpenInUI) {
                                reopenComposer(composerPayload);
                            } else {
                                openComposer(composerPayload);
                            }

                        } catch (error) {
                            console.error("Failed to load draft from URL:", error);
                            if (isComposerOpenInUI) closeComposer();
                        }
                    }
                }
            } else {
                if (isComposerOpenInUI) {
                    closeComposer();
                }
            }
        };

        syncStateWithUrl();
    }, [searchParams, draftId, isMaximized, isOpen, openComposer, reopenComposer, closeComposer]);

    return <>{children}</>;
}