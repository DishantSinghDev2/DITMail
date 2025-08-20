// app/mail/[folder]/[messageId]/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMessageThread, getMessagePositionInFolder } from "@/lib/data/messages";
import { MessageViewClient } from "@/components/mail/MessageViewClient";
import { notFound } from "next/navigation";
import { SessionUser } from "@/types";

interface PageProps {
    params: { 
        folder: string; // The folder is part of the route
        messageId: string;
    };
}

export default async function MessagePage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    if (!user) {
        return notFound();
    }

    // Fetch both the thread content and its position in the folder concurrently
    const [threadMessages, positionData] = await Promise.all([
        getMessageThread(user.id, params.messageId),
        getMessagePositionInFolder(user.id, params.folder, params.messageId)
    ]);

    if (!threadMessages || threadMessages.length === 0) {
        return notFound();
    }

    // Now, pass all the required props to the client component
    return (
        <MessageViewClient
            threadMessages={threadMessages}
            totalMessages={positionData.total}
            currentMessage={positionData.index}
        />
    );
}