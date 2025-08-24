import { Suspense } from 'react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SessionUser } from "@/types";
import { getOrganizationStats, getSystemHealth, getRecentActivity } from "@/lib/data/admin";
import { DashboardClient } from '@/components/admin/DashboardClient';
import { DashboardSkeleton } from '@/components/admin/Skeletons';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser;

  // Fetch all data concurrently on the server before the page is rendered
  const [stats, health, activity] = await Promise.all([
    getOrganizationStats(user.org_id),
    getSystemHealth(),
    getRecentActivity(user.org_id)
  ]);

  // The Suspense boundary shows a skeleton while data is being fetched on the server
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {/* The client component receives all data as props */}
      <DashboardClient
        stats={stats}
        health={health}
        activity={activity}
      />
    </Suspense>
  );
}