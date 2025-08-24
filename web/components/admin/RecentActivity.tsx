"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  UserIcon,
  EnvelopeIcon,
  TrashIcon,
  StarIcon,
  FolderIcon,
  CogIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"

interface ActivityItem {
  _id: string
  user_id: string
  user_name: string
  user_email: string
  action: string
  details: any
  ip: string
  user_agent: string
  created_at: string // This will be an ISO string
}

interface RecentActivityProps {
  limit?: number
  // Renamed refreshInterval to clientRefreshInterval to avoid confusion with server revalidate
  clientRefreshInterval?: number 
  initialActivities: ActivityItem[]; // New prop for server-fetched data
}

export default function RecentActivity({ limit = 10, clientRefreshInterval = 30000, initialActivities }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities); // Use initial data
  const [loading, setLoading] = useState(false); // Only for client-side fetches
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // If there's a filter selected or a refresh interval, then trigger client-side fetches
    if (filter !== "all" || clientRefreshInterval > 0) {
      // Fetch initially based on filter (if not "all")
      if (filter !== "all") {
        fetchActivities();
      }
      // Set up interval for subsequent refreshes
      const interval = setInterval(fetchActivities, clientRefreshInterval);
      return () => clearInterval(interval);
    }
    // If no client-side refresh is needed, ensure activities are from initial props
    // This handles cases where filter is "all" and no refresh interval.
    setActivities(initialActivities);
  }, [limit, filter, clientRefreshInterval, initialActivities]); // Added initialActivities to dependencies

  const fetchActivities = async () => {
    setLoading(true); // Indicate loading for client-side refreshes
    try {
      // Token is no longer required as `getRecentActivity` is a server function
      // If this client-side API call is still needed, ensure your /api/admin/activity
      // is protected. For this client component to fetch its own data, it needs its own token.
      // Assuming you get accessToken from localStorage as before for client-side fetches.
      const token = localStorage.getItem("accessToken"); 

      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(filter !== "all" && { action: filter }),
      });

      const response = await fetch(`/api/admin/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, // Use token for client-side API calls
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      } else {
        console.error("Failed to fetch activities client-side:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Error fetching activities client-side:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => { /* ... */ return <ExclamationTriangleIcon className="h-4 w-4" />; };
  const getActionColor = (action: string) => { /* ... */ return "text-gray-600 bg-gray-100"; };
  const formatActionText = (activity: ActivityItem) => { /* ... */ return `${activity.user_name} performed ${activity.action.replace(/_/g, " ")}`; };

  const filterOptions = [
    { value: "all", label: "All Activities" },
    { value: "user_login", label: "Logins" },
    { value: "email_sent", label: "Emails Sent" },
    { value: "email_received", label: "Emails Received" },
    { value: "security_alert", label: "Security Alerts" },
    { value: "settings_updated", label: "Settings Changes" },
  ];

  if (loading) { // This loading state is for client-side refreshes, not initial render
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-200">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6">
        {(activities || []).length === 0 ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(activities || []).map((activity) => (
              <div key={activity._id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${getActionColor(activity.action)}`}>
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatActionText(activity)}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-gray-500">
                      {/* Check if created_at exists before passing to new Date() */}
                      {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }) : 'N/A'}
                    </p>
                    {activity.ip && <>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <p className="text-xs text-gray-500">IP: {activity.ip}</p>
                    </>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={fetchActivities}
            className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            Refresh Activity
          </button>
        </div>
      </div>
    </div>
  )
}