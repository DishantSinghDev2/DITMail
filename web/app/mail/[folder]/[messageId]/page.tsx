import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMessageThread, getMessagePositionInFolder } from "@/lib/data/messages"; // Removed getDraftById
import { MessageViewClient } from "@/components/mail/MessageViewClient";
import { notFound, redirect } from "next/navigation";
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
        // Using redirect for unauthenticated users might be better for UX
        redirect("/api/auth/signin/wyi");
    }
    
    // --- START: CORRECTED DRAFT LOGIC ---
    // If the user is trying to view a draft message...
    if (params.folder === 'drafts') {
        // ...we don't render a page for it. Instead, we redirect them.
        // The redirection URL will include the `compose` query parameter,
        // which our client-side `ComposerSyncProvider` is designed to detect.
        
        const draftId = params.messageId;

        // Redirect to the main drafts view, but with the instruction to open the composer.
        // The client will handle fetching the draft's content.
        redirect(`/mail/drafts?compose=${draftId}`);
    }
    // --- END: CORRECTED DRAFT LOGIC ---

    // --- Regular message logic remains the same ---
    const [threadMessages, positionData] = await Promise.all([
        getMessageThread(user.id, params.messageId),
        getMessagePositionInFolder(user.id, params.folder, params.messageId)
    ]);

    if (!threadMessages || threadMessages.length === 0) {
        return notFound();
    }

    return (
        <MessageViewClient
            initialThreadMessages={threadMessages}
            totalMessages={positionData.total}
            currentMessage={positionData.index}
            previousMessageId={positionData.previousMessageId}
            nextMessageId={positionData.nextMessageId}
        />
    );
}