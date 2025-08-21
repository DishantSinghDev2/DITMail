// /app/mail/[folder]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMessagesForFolder, getDraftsForUser } from "@/lib/data/messages"; // <--- IMPORT getDraftsForUser
import { MessageListClient } from "@/components/mail/MessageListClient";
import { notFound } from "next/navigation";
import { SessionUser } from "@/types";

interface PageProps {
  params: { folder: string };
  searchParams: { page?: string };
}

export default async function FolderPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!user) return notFound();

  const currentPage = Number(searchParams.page) || 1;
  const folder = params.folder || "inbox";
  
  // --- CONDITIONAL DATA FETCHING LOGIC ---
  let data;
  if (folder === 'drafts') {
    // If the folder is 'drafts', call the new function
    data = await getDraftsForUser(user.id, currentPage);
  } else {
    // Otherwise, call the existing function for regular messages
    data = await getMessagesForFolder(user.id, folder, currentPage);
  }
  
  // Dummy storage data - this should also be fetched from a server-side function
  const storageInfo = { usedGB: 15, totalGB: 30 };

  return (
    <MessageListClient
      initialMessages={data.messages}
      totalMessages={data.total}
      currentPage={currentPage}
      folder={folder}
      storageUsedGB={storageInfo.usedGB}
      storageTotalGB={storageInfo.totalGB}
    />
  );
}