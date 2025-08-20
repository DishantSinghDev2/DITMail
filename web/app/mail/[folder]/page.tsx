// app/mail/[folder]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMessagesForFolder } from "@/lib/data/messages";
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
  
  // Server-side data fetch using our cached function
  const { messages, total } = await getMessagesForFolder(user.id, folder, currentPage);
  
  // Dummy storage data - this should also be fetched from a server-side function
  const storageInfo = { usedGB: 15, totalGB: 30 }; 

  return (
    <MessageListClient
      initialMessages={messages}
      totalMessages={total}
      currentPage={currentPage}
      folder={folder}
      storageUsedGB={storageInfo.usedGB}
      storageTotalGB={storageInfo.totalGB}
    />
  );
}