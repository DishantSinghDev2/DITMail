"use client";
import DashboardStats from "@/components/admin/DashboardStats";
import SystemHealth from "@/components/admin/SystemHealth";
import RecentActivity from "@/components/admin/RecentActivity";
import UsageCharts from "@/components/admin/UsageCharts";
// Define the types for the props it will receive
interface DashboardClientProps {
    stats: any;
    health: any;
    activity: any[];
}
export function DashboardClient({ stats, health, activity }: DashboardClientProps) {
    // No more loading state, useEffect, or data fetching.
    // The component is now simple, fast, and only handles presentation.
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Monitor and manage your DITMail system</p>
            </div>
            {/* Stats Overview */}
            <DashboardStats stats={stats} />

            {/* System Health & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
                <SystemHealth health={health} />
                <RecentActivity activities={activity} />
            </div>

            {/* Usage Charts */}
            <UsageCharts />
        </div>
    );
}