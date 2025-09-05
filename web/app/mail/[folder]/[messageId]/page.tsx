// /home/dit/DITMail/web/app/mail/[folder]/[messageId]
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
        redirect("/api/auth/signin/wyi");
    }
    
    if (params.folder === 'drafts') {
        const draftId = params.messageId;
        redirect(`/mail/drafts?compose=${draftId}`);
    }

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