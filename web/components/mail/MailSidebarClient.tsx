"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from "next-auth/react";
import { SessionUser } from "@/types";
import { FolderCounts } from "@/lib/data/mail";
import { useComposerStore } from "@/lib/store/composer";
// Your icon imports
import { InboxIcon, PaperAirplaneIcon, DocumentIcon, TrashIcon, StarIcon, PlusIcon, Bars3Icon } from "@heroicons/react/24/outline";

interface MailSidebarClientProps {
  user: SessionUser;
  initialFolderCounts: FolderCounts;
}

const defaultFolders = [
  { id: "inbox", name: "Inbox", icon: InboxIcon },
  { id: "sent", name: "Sent", icon: PaperAirplaneIcon },
  { id: "drafts", name: "Drafts", icon: DocumentIcon },
  { id: "starred", name: "Starred", icon: StarIcon },
  { id: "trash", name: "Trash", icon: TrashIcon },
];

export function MailSidebarClient({ user, initialFolderCounts }: MailSidebarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const openComposer = useComposerStore((state) => state.openComposer);

  const [folderCounts, setFolderCounts] = useState(initialFolderCounts);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Determine the currently selected folder from the URL
  const selectedFolder = pathname.split('/')[2] || 'inbox';

  // Periodically refresh counts on the client
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/mail/counts');
      if (res.ok) {
        const data = await res.json();
        setFolderCounts(data.counts);
      }
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  const onFolderSelect = (folder: string) => {
    router.push(`/mail/${folder}`);
  };

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}>
      <div className="p-4 flex items-center space-x-4 h-[65px]">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 text-gray-500">
          <Bars3Icon className="h-6 w-6" />
        </button>
        {!isCollapsed && <h1 className="text-xl font-bold">DITMail</h1>}
      </div>

      <div className="px-2 py-4">
        <button onClick={() => openComposer()} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-medium">
          <PlusIcon className="h-5 w-5" />
          {!isCollapsed && <span>Compose</span>}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {defaultFolders.map((folder) => {
          const Icon = folder.icon;
          const unreadCount = folderCounts[folder.id]?.unread || 0;
          const isSelected = selectedFolder === folder.id;

          return (
            <button
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              title={folder.name}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md group ${isCollapsed ? 'justify-center' : 'justify-between'} ${isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{folder.name}</span>}
              </div>
              {!isCollapsed && unreadCount > 0 && (
                <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : ''}`}>
           <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {user.name?.charAt(0).toUpperCase()}
           </div>
           {!isCollapsed && (
            <div className="flex-1 min-w-0">
               <p className="text-sm font-medium truncate">{user.name}</p>
               <button onClick={() => signOut()} className="text-xs text-red-500 hover:underline">Sign Out</button>
            </div>
           )}
        </div>
      </div>
    </div>
  );
}