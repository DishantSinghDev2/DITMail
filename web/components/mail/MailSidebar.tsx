import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SessionUser } from '@/types';
import { getFolderCounts } from '@/lib/data/mail';
import { MailSidebarClient } from './MailSidebarClient';

export async function MailSidebar() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser;

  // Fetch initial counts on the server
  const initialFolderCounts = await getFolderCounts(user.id);

  return <MailSidebarClient user={user} initialFolderCounts={initialFolderCounts} />;
}