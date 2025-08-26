// /app/mail/[folder]/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMessagesForFolder } from "@/lib/data/messages";
import { MessageListClient } from "@/components/mail/MessageListClient";
import { notFound } from "next/navigation";
import { SessionUser } from "@/types";

// Update PageProps to accept all possible search parameters.
interface PageProps {
  params: { folder: string };
  searchParams: {
    page?: string;
    search?: string;
    threadId?: string;
    starred?: string;
    unread?: string;
    hasAttachments?: string;
    priority?: string;
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    sender?: string;
    recipient?: string;
    size?: string;
    label?: string;
  };
}

export default async function FolderPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!user) return notFound();

  const folder = params.folder || "inbox";
  
  // --- CORRECTED DATA FETCHING LOGIC ---
  
  // The folder from the URL is the primary folder.
  // The options object will contain all other filters from the search params.
  const options = {
      folder: folder,
      page: Number(searchParams.page) || 1,
      search: searchParams.search,
      threadId: searchParams.threadId,
      starred: searchParams.starred === 'true',
      unread: searchParams.unread === 'true',
      hasAttachments: searchParams.hasAttachments === 'true',
      priority: searchParams.priority,
      timeRange: searchParams.timeRange,
      startDate: searchParams.startDate,
      endDate: searchParams.endDate,
      sender: searchParams.sender,
      recipient: searchParams.recipient,
      size: searchParams.size,
      label: searchParams.label,
  };

  // Note: The separate 'getDraftsForUser' is no longer needed,
  // as the main function now handles the 'drafts' case internally.
  const data = await getMessagesForFolder(user.id, options);

  return (
    <MessageListClient
      initialMessages={data.messages}
      pagination={data.pagination} // Pass the whole pagination object
      folder={folder}
      storageInfo={data.storage} // Pass the whole storage object
    />
  );
}