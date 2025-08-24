// /components/mail/MailSidebar.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SessionUser } from '@/types';
import { MailSidebarClient } from './MailSidebarClient';

// Import your new data fetching functions
import { getFolderCounts, getCustomFolders, getLabels } from '@/lib/data/mail';

export async function MailSidebar() {
  const session = await getServerSession(authOptions);
  // It's good practice to handle the case where the session might not exist,
  // even if the layout redirects.
  if (!session?.user) {
    return null; // Or a loading skeleton
  }
  const user = session.user as SessionUser;

  // Fetch all initial data concurrently for better performance
  const [
    initialFolderCounts,
    initialCustomFolders,
    initialLabels
  ] = await Promise.all([
    getFolderCounts(user.id),
    getCustomFolders(user.id),
    getLabels(user.id)
  ]);

  return (
    <MailSidebarClient
      user={user}
      initialFolderCounts={initialFolderCounts}
      initialCustomFolders={initialCustomFolders}
      initialLabels={initialLabels}
    />
  );
}