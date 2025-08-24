// /app/admin/domains/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SessionUser } from '@/types';
import { getOrganizationDomains } from '@/lib/data/admin';
import { DomainsPageClient } from '@/components/admin/DomainsPageClient';
import { DomainsTableSkeleton } from '@/components/admin/Skeletons'; // Import the skeleton
import { Suspense } from 'react';

export default async function AdminDomainsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser; // Layout ensures user and role check

  // Fetch initial domain data on the server
  const initialDomains = await getOrganizationDomains(user.org_id);

  return (
    // Use Suspense to show a loading skeleton while the server fetches data
    <Suspense fallback={<DomainsTableSkeleton />}>
      {/* Pass the server-fetched data to the client component */}
      <DomainsPageClient initialDomains={initialDomains} />
    </Suspense>
  );
}