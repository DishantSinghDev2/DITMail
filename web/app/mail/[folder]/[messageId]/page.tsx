import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// Make sure getDraftById is imported if you use it, or remove it if not.
import { getMessageThread, getMessagePositionInFolder, getDraftById } from "@/lib/data/messages";
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
        return notFound();
    }
    
    // --- Draft check logic remains the same ---
    if (params.folder === 'drafts') {
        const draftData = await getDraftById(user.id, params.messageId);
        if (draftData) {
            const urlParams = new URLSearchParams();
            urlParams.set('openComposer', 'true');
            urlParams.set('draftId', draftData.draftId);
            urlParams.set('initialData', JSON.stringify(draftData.initialData));
            urlParams.set('initialAttachments', JSON.stringify(draftData.initialAttachments));
            redirect(`/mail/drafts?${urlParams.toString()}`);
        }
        return notFound();
    }

    // --- UPDATED REGULAR MESSAGE LOGIC ---
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
            // Pass the entire positionData object for simplicity,
            // or destructure it like below.
            totalMessages={positionData.total}
            currentMessage={positionData.index}
            previousMessageId={positionData.previousMessageId}
            nextMessageId={positionData.nextMessageId}
        />
    );
}
