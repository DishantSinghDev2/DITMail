"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  UserIcon, BuildingOfficeIcon, GlobeAltIcon, CpuChipIcon, 
  AtSymbolIcon, InboxArrowDownIcon, UserGroupIcon, // <-- New Icons
  XMarkIcon
} from "@heroicons/react/24/outline";

interface SettingsSidebarProps {
  activeTab: string; // Still needed to style the active link
  user: any; // Use a more specific type if available
}

export default function SettingsSidebar({ activeTab, user }: SettingsSidebarProps) {
  const searchParams = useSearchParams();

  const createSettingsLink = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("settings", tab);
    return `?${params.toString()}`;
  };

  // We need a way to close the sidebar by removing the settings param
  const createCloseLink = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("settings");
    return `?${params.toString()}`;
  }

  const tabs = [
    { id: "profile", name: "Profile", icon: UserIcon },
    { id: "contacts", name: "Contacts", icon: UserGroupIcon },
    { id: "connection", name: "Connection", icon: CpuChipIcon },
    { id: "organization", name: "Organization", icon: BuildingOfficeIcon, adminOnly: true },
    { id: "domains", name: "Domains", icon: GlobeAltIcon, adminOnly: true },
    { id: "aliases", name: "Aliases", icon: AtSymbolIcon, adminOnly: true },
    { id: "catch-all", name: "Catch-All", icon: InboxArrowDownIcon, adminOnly: true },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        {/* Close button that navigates to a URL without the settings param */}
        <Link href={createCloseLink()} scroll={false} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
          <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </Link>
      </div>

      <nav className="mt-6 flex-1">
        {tabs.map((tab) => {
          if (tab.adminOnly && !["owner", "admin"].includes(user?.role)) {
            return null;
          }

          return (
            <Link
              key={tab.id}
              href={createSettingsLink(tab.id)}
              scroll={false} // Prevent page from scrolling to top on navigation
              className={`w-full flex items-center px-6 py-3 text-left text-sm font-medium transition-colors ${activeTab === tab.id
                  ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-4 border-blue-700"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
            >
              <tab.icon className="h-5 w-5 mr-3" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}