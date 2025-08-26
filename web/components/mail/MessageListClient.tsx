"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { MessageThread } from "@/types";
import { formatDistanceToNow } from "date-fns";
import {
  PaperClipIcon,
  StarIcon,
  TrashIcon,
  ArchiveBoxIcon,
  EllipsisVerticalIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import Dropdown from "../ui/Dropdown"; // Assuming path is correct
import { ArrowDownWideNarrow, ChevronDown, MailMinus, MailOpen, OctagonAlert } from "lucide-react";
import { useComposerStore } from "@/lib/store/composer"; // <--- IMPORT ZUSTAND STORE

// --- PROPS INTERFACE (THE FIX IS HERE) ---
interface MessageListClientProps {
  initialMessages: MessageThread[];
  // totalMessages and currentPage are now inside the pagination object
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  folder: string;
  // This now accepts a single object, matching what the server sends
  storageInfo: {
    used: number;
    limit: number;
  };
}


const ITEMS_PER_PAGE = 25; // Should match the server-side limit

export function MessageListClient({
  initialMessages,
  pagination, // Destructure the new pagination prop
  folder,
  storageInfo, // Destructure the new storageInfo prop
}: MessageListClientProps) {
  // --- HOOKS ---
  const router = useRouter();
  const { toast } = useToast();

  // --- STATE MANAGEMENT ---
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // --- EFFECTS ---
  useEffect(() => {
    setSelectedMessages(new Set());
  }, [initialMessages]);

  useEffect(() => {
    const isAllSelected = selectedMessages.size === initialMessages.length && initialMessages.length > 0;
    const isPartiallySelected = selectedMessages.size > 0 && selectedMessages.size < initialMessages.length;
    setSelectAll(isAllSelected);
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [selectedMessages, initialMessages]);

  // --- CORE HANDLERS ---
  const handleBulkAction = async (action: string) => {
    if (selectedMessages.size === 0) return;

    try {
      const response = await fetch('/api/messages/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          messageIds: Array.from(selectedMessages),
          currentFolder: folder,
        }),
      });

      if (!response.ok) throw new Error("API request failed");

      toast({ title: "Success", description: "Messages have been updated." });

      // router.refresh() tells Next.js to re-run the Server Component's data fetch
      router.refresh();
    } catch (error) {
      console.error("Bulk action error:", error);
      toast({ title: "Error", description: "Could not update messages.", variant: "destructive" });
    }
  };

  const handleSingleStar = async (messageId: string, starred: boolean) => {
    // Refresh immediately for snappy UI, then perform the action.
    // In a real-world scenario, you might do an optimistic update here.
    router.refresh();

    try {
      await fetch('/api/messages/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: starred ? 'star' : 'unstar',
          messageIds: [messageId],
          currentFolder: folder
        })
      });
    } catch (error) {
      toast({ title: "Error", description: "Could not update star status.", variant: "destructive" });
      // You could add logic to revert the optimistic update here.
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const onPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.pages) return;

    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const onMessageSelect = (message: MessageThread) => {
    const params = new URLSearchParams(window.location.search);

    if (message.isDraft) {
      // For a draft, set the 'compose' param to the draft's ID
      params.set('compose', message._id);
      router.push(`${pathname}?${params.toString()}`);
    } else {
      // For a regular message, navigate to its detail page
      // We also clear the 'compose' param to ensure the composer closes
      params.delete('compose');
      const queryString = params.toString();
      router.push(`/mail/${folder}/${message._id}${queryString ? `?${queryString}` : ''}`);
    }
  };




  // --- SELECTION & SORTING ---
  const handleSelectMessage = (messageId: string, checked: boolean) => {
    const newSelected = new Set(selectedMessages);
    if (checked) {
      newSelected.add(messageId);
    } else {
      newSelected.delete(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleSelectionChange = (type: "all" | "none" | "read" | "unread" | "starred" | "unstarred") => {
    let newSelectedIds = new Set<string>();
    if (type === "all") {
      newSelectedIds = new Set(initialMessages.map((msg) => msg._id));
    } else if (type !== "none") {
      initialMessages.forEach((msg) => {
        const condition =
          (type === "read" && msg.read) ||
          (type === "unread" && !msg.read) ||
          (type === "starred" && msg.starred) ||
          (type === "unstarred" && !msg.starred);

        if (condition) {
          newSelectedIds.add(msg._id);
        }
      });
    }
    setSelectedMessages(newSelectedIds);
  };

  // const sortedMessages = useCallback(() => {
  //   return [...initialMessages].sort((a, b) => {
  //     let comparison = 0;
  //     switch (sortBy) {
  //       case "date":
  //         comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  //         break;
  //       case "sender":
  //         comparison = (folder === "sent" ? a.to[0] : a.from).localeCompare(folder === "sent" ? b.to[0] : b.from);
  //         break;
  //       case "subject":
  //         comparison = a.subject.localeCompare(b.subject);
  //         break;
  //     }
  //     return sortOrder === "desc" ? -comparison : comparison;
  //   });
  // }, [initialMessages, sortBy, sortOrder, folder]);

  const currentMessages = initialMessages;

  // --- RENDER LOGIC (MORE FIXES HERE) ---
  const { page: currentPage, total: totalMessages } = pagination;
  const paginationStart = Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalMessages);
  const paginationEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalMessages);

  // Calculate width safely to prevent division by zero
  const storagePercentage = storageInfo.limit > 0 ? (storageInfo.used / storageInfo.limit) * 100 : 0;


  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header with controls */}
      <div className="border-b border-gray-200 p-2 sm:p-4 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center relative z-20 p-1 cursor-pointer hover:bg-gray-200 rounded">
              <input
                type="checkbox"
                ref={selectAllCheckboxRef}
                checked={selectAll}
                onChange={(e) => handleSelectionChange(e.target.checked ? "all" : "none")}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Dropdown
                trigger={<button className="px-1 text-sm text-gray-600 pt-1.5"><ChevronDown className="h-4 w-4" /></button>}
                items={[
                  { label: "All", onClick: () => handleSelectionChange("all") },
                  { label: "None", onClick: () => handleSelectionChange("none") },
                  { label: "Read", onClick: () => handleSelectionChange("read") },
                  { label: "Unread", onClick: () => handleSelectionChange("unread") },
                  { label: "Starred", onClick: () => handleSelectionChange("starred") },
                  { label: "Unstarred", onClick: () => handleSelectionChange("unstarred") },
                ]}
                align="left"
              />
            </div>

            {selectedMessages.size > 0 ? (
              <div className="flex items-center space-x-1">
                <button title="Archive" onClick={() => handleBulkAction('archive')} className="p-2 hover:bg-gray-100 rounded-full"><ArchiveBoxIcon className="h-4 w-4 text-gray-500" /></button>
                <button title="Mark as spam" onClick={() => handleBulkAction('spam')} className="p-2 hover:bg-gray-100 rounded-full"><OctagonAlert className="h-4 w-4 text-gray-500" /></button>
                <button title="Delete" onClick={() => handleBulkAction('delete')} className="p-2 hover:bg-gray-100 rounded-full"><TrashIcon className="h-4 w-4 text-gray-500" /></button>
                <div className="bg-gray-200 w-0.5 h-5"></div>
                <button title="Mark as read" onClick={() => handleBulkAction('read')} className="p-2 hover:bg-gray-100 rounded-full"><MailOpen className="h-4 w-4 text-gray-500" /></button>
                <Dropdown
                  trigger={<button title="More options" className="p-2 hover:bg-gray-100 rounded-full"><EllipsisVerticalIcon className="h-4 w-4 text-gray-400" /></button>}
                  items={[
                    { label: "Mark as unread", onClick: () => handleBulkAction('unread'), icon: MailMinus },
                    { label: "Star", onClick: () => handleBulkAction('star'), icon: StarIconSolid },
                    { label: "Unstar", onClick: () => handleBulkAction('unstar'), icon: StarIcon },
                  ]}
                />
              </div>
            ) : (
              <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 text-gray-500 hover:text-gray-700 rounded-full disabled:opacity-50" title="Refresh">
                <ArrowPathIcon className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              {totalMessages > 0 ? `${paginationStart}-${paginationEnd} of ${totalMessages}` : "0 of 0"}
            </span>
            <div className="flex items-center">
              <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 text-gray-500 hover:text-gray-700 rounded-full disabled:opacity-50"><ChevronLeftIcon className="h-3.5 w-3.5" /></button>
              <button onClick={() => onPageChange(currentPage + 1)} disabled={paginationEnd >= totalMessages} className="p-2 text-gray-500 hover:text-gray-700 rounded-full disabled:opacity-50"><ChevronRightIcon className="h-3.5 w-3.5" /></button>
            </div>
            {/* Sorting dropdown can be re-added here if needed */}
          </div>
        </div>
      </div>

      {currentMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
          <div className="text-6xl mb-4">{folder === "inbox" ? "📭" : "📂"}</div>
          <h3 className="text-lg font-medium mb-2">No messages here</h3>
          <p className="text-sm mb-4">Your {folder} folder is empty.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-200">
            {currentMessages.map((message) => (
              <div
                key={message._id}
                className={`flex items-start p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${!message.read ? "bg-blue-50/50 font-medium" : ""} ${selectedMessages.has(message._id) ? "bg-blue-100" : ""}`}
                onClick={() => onMessageSelect(message)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 ${!message.read ? 'bg-blue-600' : 'bg-transparent'}"></div>
                <div className="flex items-center gap-3 mr-3">
                  <input
                    type="checkbox"
                    checked={selectedMessages.has(message._id)}
                    onChange={(e) => handleSelectMessage(message._id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3.5 h-3.5 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleSingleStar(message._id, !message.starred); }} className="p-1 rounded-full">
                    {message.starred ? (<StarIconSolid className="h-5 w-5 text-yellow-500" />) : (<StarIcon className="h-5 w-5 text-gray-300 hover:text-gray-500" />)}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="text-sm truncate pr-2">
                      <span className={!message.read ? "text-gray-900" : "text-gray-600"}>
                        {folder === "sent" ? `To: ${message.to.join(", ")}` : message.from} {message.messageCount > 1 && <span className="text-gray-500 ml-1 text-xs">({message.messageCount})</span>}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {message.attachments?.length > 0 && <PaperClipIcon className="h-4 w-4 text-gray-400" />}
                      <span className={`text-xs whitespace-nowrap ${!message.read ? "text-gray-800 font-bold" : "text-gray-500"}`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className={`text-sm truncate pr-4 ${!message.read ? "text-gray-800" : "text-gray-700"}`}>
                    {message.subject || "(no subject)"}
                  </div>
                  <div className="text-xs text-gray-500 truncate pr-4">{message.text || "No preview available"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer (THE FIX IS HERE) */}
      <div className="border-t border-gray-200 p-2 bg-white text-xs text-gray-600 sticky bottom-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="w-1/3">
            {/* Use the properties from the storageInfo object */}
            <p>{storageInfo.used.toFixed(2)} GB of {storageInfo.limit} GB used</p>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div
                className="bg-blue-600 h-1 rounded-full"
                style={{ width: `${storagePercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-blue-700">Terms</a>
            <a href="#" className="hover:text-blue-700">Privacy</a>
          </div>
        </div>
      </div>
    </div>
  );
}