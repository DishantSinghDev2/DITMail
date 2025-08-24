"use client"; // <-- THE FIX: Make this component a Client Component

import Link from "next/link";
import { HomeIcon, UsersIcon, GlobeAltIcon, CogIcon } from "@heroicons/react/24/outline";
import { AdminSidebarNav } from "./AdminSidebarNav";
import { SessionUser } from "@/types";

// The navigation items are now defined within a Client Component, which is fine.
const navigation = [
  { name: "Dashboard", href: "/admin", icon: HomeIcon },
  { name: "Users", href: "/admin/users", icon: UsersIcon },
  { name: "Domains", href: "/admin/domains", icon: GlobeAltIcon },
  { name: "Settings", href: "/admin/settings", icon: CogIcon },
];

export function AdminSidebar({ user }: { user: SessionUser }) {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
        {/* You can still safely use the user prop passed from the server layout */}
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.name}</p>
      </div>

      {/* Now you are passing props between two Client Components, which is allowed. */}
      <AdminSidebarNav navigation={navigation} />

      <div className="mt-auto p-6 border-t border-gray-200 dark:border-gray-700">
        <Link href="/mail/inbox" className="flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          ← Back to Mail
        </Link>
      </div>
    </div>
  );
}