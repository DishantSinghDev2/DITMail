"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from "./SearchBar"; // Assuming path is correct from your structure
import SettingsDropdown from "./SettingsDropdown";
import NotificationPanel from "./NotificationPanel";
import UpgradeModal from "./UpgradeModal";
import { BellIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Settings } from "lucide-react";

// A simple type for notifications
interface Notification {
  id: string;
  text: string;
  read: boolean;
}

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    unread: false,
    starred: false,
    hasAttachments: false,
    // Add other filters as needed from your SearchBar component
  });
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(3); // Mock data
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  // Dark mode/theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState('theme-default');

  // --- EFFECTS ---
  // Sync search bar with URL parameters on initial load or navigation
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    // You can also parse filter params from the URL here if you add them
  }, [searchParams]);
  
  // Effect for managing dark mode and theme classes on the root element
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.className = root.className.replace(/theme-\S+/g, '').trim();
    root.classList.add(theme);
  }, [isDarkMode, theme]);

  // Effect to fetch initial notifications (mocked here)
  useEffect(() => {
    // In a real app, you'd fetch this from an API endpoint
    setNotifications([
      { id: '1', text: 'New feature: AI-powered summaries are here!', read: false },
      { id: '2', text: 'Your monthly report is ready for download.', read: false },
      { id: '3', text: 'Security alert: New login from an unrecognized device.', read: false },
    ]);
  }, []);

  // --- HANDLERS ---
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    
    // Append active filters to the search params
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, String(value));
      }
    });

    // Navigate to a dedicated search page with the query params
    router.push(`/mail/search?${params.toString()}`);
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onSearch={handleSearch}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Right-side Icons */}
          <div className="flex items-center space-x-2">
            
            {/* Settings Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <SettingsDropdown
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                currentTheme={theme}
                onChangeTheme={setTheme}
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Notifications"
              >
                <BellIcon className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            {/* Upgrade Button */}
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1.5 rounded-full text-sm font-semibold transition-transform hover:scale-105"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Upgrade</span>
            </button>
          </div>
        </div>
      </header>

      {/* Upgrade Modal (rendered outside the header for proper stacking) */}
      {isUpgradeModalOpen && <UpgradeModal onClose={() => setIsUpgradeModalOpen(false)} />}
    </>
  );
}