"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signOut } from "next-auth/react";
import { SessionUser } from "@/types";
import { FolderCounts } from "@/lib/data/mail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { mailAppEvents } from "@/lib/events";
import { useRealtime } from "@/contexts/RealtimeContext";

import {
  InboxIcon, PaperAirplaneIcon, DocumentIcon, TrashIcon, StarIcon, ArchiveBoxIcon, ExclamationTriangleIcon,
  PlusIcon, UserIcon, ArrowRightOnRectangleIcon, FolderIcon, ChevronDownIcon, ChevronRightIcon, Bars3Icon, Cog6ToothIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import ComposeLink from "./ComposeLink";

// --- Type Definitions ---
interface MailSidebarClientProps {
  user: SessionUser;
  initialFolderCounts: FolderCounts;
  initialCustomFolders: CustomFolder[];
  initialLabels: Label[];
}
interface CustomFolder { _id: string; name: string; }
interface Label { _id: string; name: string; color: string; }

// --- Constants ---
const defaultFolders = [
  { id: "inbox", name: "Inbox", icon: InboxIcon },
  { id: "sent", name: "Sent", icon: PaperAirplaneIcon },
  { id: "drafts", name: "Drafts", icon: DocumentIcon },
  { id: "starred", name: "Starred", icon: StarIcon },
  { id: "archive", name: "Archive", icon: ArchiveBoxIcon },
  { id: "spam", name: "Spam", icon: ExclamationTriangleIcon },
  { id: "trash", name: "Trash", icon: TrashIcon },
];

const labelColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

// --- Main Component ---
export function MailSidebarClient({ user, initialFolderCounts, initialCustomFolders, initialLabels }: MailSidebarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- State Management ---
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [folderCounts, setFolderCounts] = useState(initialFolderCounts);
  const [customFolders, setCustomFolders] = useState(initialCustomFolders);
  const [labels, setLabels] = useState(initialLabels);

  // UI State
  const [showCustomFolders, setShowCustomFolders] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(labelColors[0]);
  const { newMessages } = useRealtime();


  // --- Derived State ---
  const isExpanded = !isCollapsed || isHovering;
  const selectedPath = pathname.split('/')[2] || 'inbox';
  const selectedId = pathname.split('/')[3] || selectedPath;


  // --- API Functions ---
  const fetchFolderCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/counts');
      if (res.ok) {
        const data = await res.json();
        setFolderCounts(data.counts);
      }
    } catch (error) { console.error("Failed to fetch counts:", error); }
  }, []); 

  // --- Effects ---
  useEffect(() => {
    const storedState = localStorage.getItem("mailSidebarCollapsed");
    setIsCollapsed(storedState === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("mailSidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    mailAppEvents.on('countsChanged', fetchFolderCounts);

    return () => {
      mailAppEvents.off('countsChanged', fetchFolderCounts);
    };
  }, [fetchFolderCounts]);

  useEffect(() => {
    if (newMessages > 0) {
      fetchFolderCounts();
    }
  }, [newMessages, fetchFolderCounts]);



  const fetchCustomFolders = async () => {
    try {
      const res = await fetch('/api/folders');
      if (res.ok) setCustomFolders((await res.json()).folders);
    } catch (error) { console.error("Failed to fetch folders:", error); }
  };

  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/labels');
      if (res.ok) setLabels((await res.json()).labels);
    } catch (error) { console.error("Failed to fetch labels:", error); }
  };

  const handleCreate = async (type: 'folder' | 'label') => {
    const isFolder = type === 'folder';
    const endpoint = isFolder ? '/api/folders' : '/api/labels';
    const name = isFolder ? newFolderName : newLabelName;
    if (!name.trim()) return;

    const body = isFolder ? { name: name.trim() } : { name: name.trim(), color: newLabelColor };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        if (isFolder) {
          setNewFolderName("");
          setIsCreatingFolder(false);
          await Promise.all([fetchCustomFolders(), fetchFolderCounts()]);
        } else {
          setNewLabelName("");
          setNewLabelColor(labelColors[0]);
          setIsCreatingLabel(false);
          await fetchLabels();
        }
      } else {
        console.error(`Failed to create ${type}`);
      }
    } catch (error) {
      console.error(`Error creating ${type}:`, error);
    }
  };

  const handleDelete = async (type: 'folder' | 'label', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    const isFolder = type === 'folder';
    const endpoint = isFolder ? `/api/folders/${id}` : `/api/labels/${id}`;

    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        if (isFolder) {
          await Promise.all([fetchCustomFolders(), fetchFolderCounts()]);
          if (selectedPath === 'folder' && selectedId === id) router.push('/mail/inbox');
        } else {
          await fetchLabels();
        }
      } else {
        console.error(`Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
    }
  };


  // --- Render Helper Functions ---
  const renderFolderItem = (folder: { id: string, name: string, icon: React.ElementType }) => {
    const Icon = folder.icon;
    const unreadCount = folderCounts[folder.id]?.unread || 0;
    const isSelected = selectedPath === folder.id;

    return (
      <Link
        key={folder.id}
        href={`/mail/${folder.id}`}
        scroll={false} // Prevents page from jumping to top, good for layouts
        title={folder.name}
        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors group ${isExpanded ? "justify-between" : "justify-start"} ${isSelected ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!isExpanded && unreadCount > 0 && (
              <span className="absolute top-[-2px] right-[-2px] flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
            )}
          </div>
          {isExpanded && <span className="whitespace-nowrap">{folder.name}</span>}
        </div>
        {isExpanded && unreadCount > 0 && (
          <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{unreadCount}</span>
        )}
      </Link>
    );
  };

  // --- Main Return ---
  return (
    <div
      className={`relative bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out ${isExpanded ? "w-64" : "w-[3.75rem]"}`}
      onMouseEnter={() => isCollapsed && setIsHovering(true)}
      onMouseLeave={() => isCollapsed && setIsHovering(false)}
    >
      {/* Header */}
      <div className="p-4 flex items-center space-x-4 h-[65px] flex-shrink-0">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 text-gray-500" title="Toggle Sidebar">
          <Bars3Icon className="h-6 w-6" />
        </button>
        <h1 className={`text-xl font-bold whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
          DITMail
        </h1>
      </div>

      {/* Compose Button */}
      <div className="px-2 py-4 flex-shrink-0">
        <ComposeLink isExpanded={isExpanded} />
      </div>

      {/* Navigation Scroller */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1">
        {defaultFolders.map(renderFolderItem)}

        {/* Custom Folders Section */}
        <div className="border-t mt-2 pt-2">
          <div className="flex items-center justify-between px-2 py-1">
            {isExpanded && (
              <button onClick={() => setShowCustomFolders(!showCustomFolders)} className="flex items-center space-x-1 text-sm font-medium text-gray-600">
                {showCustomFolders ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                <span>Folders</span>
              </button>
            )}
            <button onClick={() => { if (isExpanded) setIsCreatingFolder(true); else setIsCollapsed(false); }} className="p-1 text-gray-400 hover:text-gray-700" title="New Folder">
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          {isExpanded && showCustomFolders && (
            <div className="pl-2 space-y-1">
              {isCreatingFolder && (
                <input
                  type="text" value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreate('folder')}
                  onBlur={() => !newFolderName.trim() && setIsCreatingFolder(false)}
                  placeholder="Folder name..."
                  className="w-full px-2 py-1 text-sm border rounded" autoFocus
                />
              )}
              {(customFolders || []).map((folder) => (
                <div key={folder._id} className="group flex items-center justify-between text-sm pr-1">
                  <Link 
                    href={`/mail/folder/${folder._id}`} 
                    scroll={false}
                    className={`flex items-center space-x-2 flex-1 p-1 rounded-md truncate ${selectedPath === 'folder' && selectedId === folder._id ? 'text-blue-700 bg-blue-50' : 'hover:bg-gray-100'}`}
                  >
                    <FolderIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    <span className="truncate">{folder.name}</span>
                  </Link>
                  <button onClick={() => handleDelete('folder', folder._id)} className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100" title="Delete">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labels Section */}
        <div className="border-t mt-2 pt-2">
          <div className="flex items-center justify-between px-2 py-1">
            {isExpanded && (
              <button onClick={() => setShowLabels(!showLabels)} className="flex items-center space-x-1 text-sm font-medium text-gray-600">
                {showLabels ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                <span>Labels</span>
              </button>
            )}
            <button onClick={() => { if (isExpanded) setIsCreatingLabel(true); else setIsCollapsed(false); }} className="p-1 text-gray-400 hover:text-gray-700" title="New Label">
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          {isExpanded && showLabels && (
            <div className="pl-2 space-y-1">
              {isCreatingLabel && (
                <div className="p-2 space-y-2 border rounded bg-gray-50">
                  <input
                    type="text" value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleCreate('label')}
                    placeholder="Label name..."
                    className="w-full px-2 py-1 text-sm border rounded" autoFocus
                  />
                  <div className="flex space-x-1.5">
                    {labelColors.map(color => (
                      <button key={color} onClick={() => setNewLabelColor(color)} className={`w-5 h-5 rounded-full border-2 ${newLabelColor === color ? 'border-blue-500' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
              )}
              {(labels || []).map((label) => (
                <div key={label._id} className="group flex items-center justify-between text-sm pr-1">
                 <Link 
                    href={`/mail/label/${label.name}`} 
                    scroll={false}
                    className={`flex items-center space-x-2 flex-1 p-1 rounded-md truncate ${selectedPath === 'label' && selectedId === label.name ? 'text-blue-700 bg-blue-50' : 'hover:bg-gray-100'}`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                    <span className="truncate">{label.name}</span>
                  </Link>
                  <button onClick={() => handleDelete('label', label._id)} className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100" title="Delete">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Menu */}
      <div className="border-t p-4 flex-shrink-0">
        <div className={`flex items-center space-x-3 ${!isExpanded ? 'justify-center' : ''}`}>
          <Avatar className="h-8 w-8">
                {user.email && <AvatarImage src={`https://whatsyour.info/api/v1/avatar/${user.email}`} alt={user.name} />}
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
          {isExpanded && (
            <div className="flex-1 min-w-0 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="flex items-center">
                <Link href="?settings=profile" scroll={false} className="p-1 text-gray-400 hover:text-gray-700" title="Settings"><Cog6ToothIcon className="h-4 w-4" /></Link>
                <button onClick={() => signOut()} className="p-1 text-gray-400 hover:text-red-500" title="Sign Out"><ArrowRightOnRectangleIcon className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}