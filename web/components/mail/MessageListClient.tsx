"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import Dropdown from "../ui/Dropdown";
import { MailMinus, MailOpen, OctagonAlert, ChevronDown } from "lucide-react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useMailStore } from "@/lib/store/mail";
import { XCircleIcon } from "@heroicons/react/24/solid";
import { mailAppEvents } from "@/lib/events";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDisplayName } from "@/lib/mail-utils";


interface MessageListClientProps {
  initialMessages: MessageThread[];
  pagination: { page: number; limit: number; total: number; pages: number; };
  folder: string;
  storageInfo: { used: number; limit: number; };
}

const ITEMS_PER_PAGE = 25;

export function MessageListClient({
  initialMessages,
  pagination,
  folder,
  storageInfo,
}: MessageListClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { newMessages, markMessagesRead } = useRealtime();
  const { data: session } = useSession();
  const currentUserEmail = session?.user?.email;
  const { optimisticallyReadIds, addOptimisticallyReadId, revertOptimisticallyReadId, pendingRemovalIds } = useMailStore();
  const { failedMessages } = useMailStore();
  const [messages, setMessages] = useState<MessageThread[]>(initialMessages);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectionActions, setSelectionActions] = useState({
    canArchive: false,
    canMarkAsSpam: false,
    canDelete: false,
    canMarkAsRead: false,
    canMarkAsUnread: false,
    canStar: false,
    canUnstar: false,
  });

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const visibleMessages = initialMessages.filter(msg => !pendingRemovalIds.has(msg._id));
    setMessages(visibleMessages);
    setSelectedMessages(new Set());
  }, [initialMessages, pendingRemovalIds]);

  useEffect(() => {
    if (selectedMessages.size === 0) {
      setSelectionActions({
        canArchive: false, canMarkAsSpam: false, canDelete: false,
        canMarkAsRead: false, canMarkAsUnread: false,
        canStar: false, canUnstar: false,
      });
      return;
    }

    const selected = messages.filter(msg => selectedMessages.has(msg._id));

    const hasUnread = selected.some(msg => !msg.read);
    const hasRead = selected.some(msg => msg.read);
    const hasUnstarred = selected.some(msg => !msg.starred);
    const hasStarred = selected.some(msg => msg.starred);

    // Determine actions based on current folder and message state
    setSelectionActions({
      canMarkAsRead: hasUnread,
      canMarkAsUnread: hasRead,
      canStar: hasUnstarred,
      canUnstar: hasStarred,
      // You can't archive/spam messages from your sent or trash folders, r?
      canArchive: folder !== 'archive' && folder !== 'sent' && folder !== 'trash',
      canMarkAsSpam: folder !== 'spam' && folder !== 'sent' && folder !== 'trash',
      // You can't delete messages that are already in the trash
      canDelete: folder !== 'trash',
    });

  }, [selectedMessages, messages, folder]);


  useEffect(() => {
    const currentMessages = messages.map(msg => ({ ...msg, read: msg.read || optimisticallyReadIds.has(msg._id) }));
    const isAllSelected = currentMessages.length > 0 && selectedMessages.size === currentMessages.length;
    const isPartiallySelected = selectedMessages.size > 0 && selectedMessages.size < currentMessages.length;
    setSelectAll(isAllSelected);
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [selectedMessages, messages, optimisticallyReadIds]);


  useEffect(() => {
    if (newMessages > 0 && folder === "inbox") {
      router.refresh();
      markMessagesRead();
    }
  }, [newMessages, folder, router, markMessagesRead]);

  const markAsReadInBackground = async (messageId: string) => {
    try {
      const response = await fetch('/api/messages/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', messageIds: [messageId] }),
      });
      if (!response.ok) throw new Error("API call failed");

      mailAppEvents.emit('countsChanged');
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      revertOptimisticallyReadId(messageId);
      toast({ title: "Sync Error", description: "Could not mark message as read.", variant: "destructive" });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedMessages.size === 0) return;

    const originalMessages = [...messages];
    const messageIdsToUpdate = Array.from(selectedMessages);
    let newMessages;

    const isDestructiveAction = ['delete', 'archive', 'spam'].includes(action);

    if (isDestructiveAction) {
      newMessages = messages.filter(msg => !messageIdsToUpdate.includes(msg._id));
    } else {
      newMessages = messages.map(msg => {
        if (messageIdsToUpdate.includes(msg._id)) {
          switch (action) {
            case 'read': return { ...msg, read: true };
            case 'unread': return { ...msg, read: false };
            case 'star': return { ...msg, starred: true };
            case 'unstar': return { ...msg, starred: false };
            default: return msg;
          }
        }
        return msg;
      });
    }

    setMessages(newMessages);
    setSelectedMessages(new Set());

    try {
      const response = await fetch('/api/messages/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, messageIds: messageIdsToUpdate, currentFolder: folder }),
      });
      if (!response.ok) throw new Error("API request failed");

      mailAppEvents.emit('countsChanged');
      router.refresh();
      toast({ title: "Success", description: "Messages have been updated." });

    } catch (error) {
      console.error("Bulk action error:", error);
      setMessages(originalMessages);
      toast({ title: "Error", description: "Could not update messages. Reverting.", variant: "destructive" });
    }
  };

  const handleSingleStar = async (messageId: string, newStarredState: boolean) => {
    const originalMessages = [...messages];
    const newMessages = messages.map(msg =>
      msg._id === messageId ? { ...msg, starred: newStarredState } : msg
    );
    setMessages(newMessages);

    try {
      const response = await fetch('/api/messages/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: newStarredState ? 'star' : 'unstar',
          messageIds: [messageId],
          currentFolder: folder
        })
      });
      if (!response.ok) throw new Error("Star update failed");
    } catch (error) {
      setMessages(originalMessages);
      toast({ title: "Error", description: "Could not update star status.", variant: "destructive" });
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
      newSelectedIds = new Set(messages.map((msg) => msg._id));
    } else if (type !== "none") {
      messages.forEach((msg) => {
        const condition =
          (type === "read" && msg.read) ||
          (type === "unread" && !msg.read) ||
          (type === "starred" && msg.starred) ||
          (type === "unstarred" && !msg.starred);
        if (condition) newSelectedIds.add(msg._id);
      });
    }
    setSelectedMessages(newSelectedIds);
  };
  const { page: currentPage, total: totalMessages } = pagination;
  const paginationStart = Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalMessages);
  const paginationEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalMessages);

  const storagePercentage = storageInfo.limit > 0 ? (storageInfo.used / storageInfo.limit) * 100 : 0;
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header and Controls */}
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
              // --- Now its smart ---
              <div className="flex items-center space-x-1">
                {selectionActions.canArchive && <button title="Archive" onClick={() => handleBulkAction('archive')} className="p-2 hover:bg-gray-100 rounded-full"><ArchiveBoxIcon className="h-4 w-4 text-gray-500" /></button>}
                {selectionActions.canMarkAsSpam && <button title="Mark as spam" onClick={() => handleBulkAction('spam')} className="p-2 hover:bg-gray-100 rounded-full"><OctagonAlert className="h-4 w-4 text-gray-500" /></button>}
                {selectionActions.canDelete && <button title="Delete" onClick={() => handleBulkAction('delete')} className="p-2 hover:bg-gray-100 rounded-full"><TrashIcon className="h-4 w-4 text-gray-500" /></button>}

                {/* Separator only appears if there are actions on both sides */}
                {(selectionActions.canArchive || selectionActions.canMarkAsSpam || selectionActions.canDelete) && (selectionActions.canMarkAsRead) && (
                  <div className="bg-gray-200 w-0.5 h-5"></div>
                )}

                {selectionActions.canMarkAsRead && <button title="Mark as read" onClick={() => handleBulkAction('read')} className="p-2 hover:bg-gray-100 rounded-full"><MailOpen className="h-4 w-4 text-gray-500" /></button>}

                <Dropdown
                  trigger={<button title="More options" className="p-2 hover:bg-gray-100 rounded-full"><EllipsisVerticalIcon className="h-4 w-4 text-gray-400" /></button>}
                  // Dropdown items are now filtered based on available actions
                  items={[
                    selectionActions.canMarkAsUnread && { label: "Mark as unread", onClick: () => handleBulkAction('unread'), icon: MailMinus },
                    selectionActions.canStar && { label: "Star", onClick: () => handleBulkAction('star'), icon: StarIconSolid },
                    selectionActions.canUnstar && { label: "Unstar", onClick: () => handleBulkAction('unstar'), icon: StarIcon },
                  ].filter(Boolean) as any}
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
          </div>
        </div>
      </div>

      {/* Message List Area */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
          <div className="text-6xl mb-4">{folder === "inbox" ? "📭" : "📂"}</div>
          <h3 className="text-lg font-medium mb-2">No messages here</h3>
          <p className="text-sm mb-4">Your {folder} folder is empty.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-200">
            {messages.map((message) => {
              const originalMessage = initialMessages.find(m => m._id === message._id);
              const isRead = message.read || optimisticallyReadIds.has(message._id);

              const displayName = folder === "sent"
                ? `To: ${message.to.map(p => formatDisplayName(p, currentUserEmail)).join(", ")}`
                : formatDisplayName(message.from, currentUserEmail);

              const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
              let href;
              if (message.isDraft) {
                params.set('compose', message._id);
                href = `${pathname}?${params.toString()}`;
              } else {
                params.delete('compose');
                const queryString = params.toString();
                href = `/mail/${folder}/${message._id}${queryString ? `?${queryString}` : ''}`;
              }
              const failureReason = failedMessages.get(message._id);

              return (
                <Link
                  key={message._id}
                  href={href}
                  scroll={false}
                  onMouseDown={() => {
                    if (!message.read && !message.isDraft) {
                      addOptimisticallyReadId(message._id);
                      markAsReadInBackground(message._id);
                    }
                  }}
                  className={`flex items-start p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${(!isRead && !message.isDraft) ? "bg-blue-50/50 font-medium" : ""} ${selectedMessages.has(message._id) ? "bg-blue-100" : ""}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${(!isRead && !message.isDraft) ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                  <div className="flex items-center gap-3 mr-3">
                    <input
                      type="checkbox"
                      checked={selectedMessages.has(message._id)}
                      onChange={(e) => handleSelectMessage(message._id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSingleStar(message._id, !message.starred);
                      }}
                      className="p-1 rounded-full"
                    >
                      {message.starred ? (<StarIconSolid className="h-5 w-5 text-yellow-500" />) : (<StarIcon className="h-5 w-5 text-gray-300 hover:text-yellow-400" />)}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="text-sm truncate pr-2">
                        {failureReason && (
                          <div className="mr-2 flex-shrink-0" title={`Delivery Failed: ${failureReason}`}>
                            <XCircleIcon className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                        <span className={!isRead ? "text-gray-900" : "text-gray-600"}>
                          {displayName} {message.messageCount > 1 && <span className="text-gray-500 ml-1 text-xs">({message.messageCount})</span>}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {message.attachments?.length > 0 && <PaperClipIcon className="h-4 w-4 text-gray-400" />}
                        <span className={`text-xs whitespace-nowrap ${!isRead ? "text-gray-800 font-bold" : "text-gray-500"}`}>
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className={`text-sm truncate pr-4 ${!isRead ? "text-gray-800" : "text-gray-700"}`}>
                      {message.subject || "(no subject)"}
                    </div>
                    <div className="text-xs text-gray-500 truncate pr-4">{message.text || "No preview available"}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 p-2 bg-white text-xs text-gray-600 sticky bottom-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="w-1/3">
            <p>{storageInfo.used.toFixed(2)} GB of {storageInfo.limit} GB used</p>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${storagePercentage}%` }}></div>
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