// /app/mail/[folder]/[messageId]/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMessageThread, getMessagePositionInFolder, getDraftById } from "@/lib/data/messages"; // <-- Import getDraftById
import { MessageViewClient } from "@/components/mail/MessageViewClient";
import { notFound, redirect } from "next/navigation"; // <-- Import redirect
import { SessionUser } from "@/types";

interface PageProps {
    params: { 
        folder: string;
        messageId: string;
    };
}

export default async function MessagePage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    if (!user) {
        return notFound();
    }
    
    // --- DRAFT CHECK LOGIC ---
    // If the user is in the 'drafts' folder, we handle it differently.
    if (params.folder === 'drafts') {
        const draftData = await getDraftById(user.id, params.messageId);

        if (draftData) {
            // We found a draft! Now we need to open the composer.
            // We can't directly trigger a client-side Zustand store from a Server Component.
            // The best UX is to redirect the user back to the main drafts folder
            // and pass a query parameter that a client component can read to
            // trigger the composer.
            
            const urlParams = new URLSearchParams();
            urlParams.set('openComposer', 'true');
            urlParams.set('draftId', draftData.draftId);
            // We must stringify complex objects to pass them in the URL
            urlParams.set('initialData', JSON.stringify(draftData.initialData));
            urlParams.set('initialAttachments', JSON.stringify(draftData.initialAttachments));
            
            redirect(`/mail/drafts?${urlParams.toString()}`);
        }
        
        // If it's not a draft, it's an invalid URL, so show 404.
        return notFound();
    }

    // --- REGULAR MESSAGE LOGIC ---
    // If the folder is not 'drafts', proceed with the normal message fetching.
    const [threadMessages, positionData] = await Promise.all([
        getMessageThread(user.id, params.messageId),
        getMessagePositionInFolder(user.id, params.folder, params.messageId)
    ]);

    if (!threadMessages || threadMessages.length === 0) {
        return notFound();
    }

    return (
        <MessageViewClient
            threadMessages={threadMessages}
            totalMessages={positionData.total}
            currentMessage={positionData.index}
        />
    );
}