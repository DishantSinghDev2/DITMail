"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Message, Attachment } from "@/types";

// --- Icon Imports ---
import {
  StarIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  PaperClipIcon,
  EllipsisVerticalIcon,
  PrinterIcon,
  TagIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { Archive, ArrowLeft, ChevronLeft, ChevronRight, MailMinus, OctagonAlert } from "lucide-react";

// --- Component Imports ---
import Dropdown from "../ui/Dropdown"; // Assuming path is correct
import SpamBanner from "../messages/SpamBanner"; // Assuming path is correct
import EmailViewer from "../messages/EmailViewer"; // Assuming path is correct
import InlineReplyComposer from "@/components/inline-reply-composer"; // Assuming path is correct
// --- NEW: Import the Zustand store ---
import { useMailStore } from "@/lib/store/mail";
import { useSession } from "next-auth/react";
import { formatDisplayName } from "@/lib/mail-utils";



// --- PROPS INTERFACE ---
interface MessageViewClientProps {
  initialThreadMessages: Message[]; // Renamed for clarity
  totalMessages: number;
  currentMessage: number;
  previousMessageId?: string | null; // Add this
  nextMessageId?: string | null;   // Add this
}


export function MessageViewClient({
  initialThreadMessages,
  totalMessages,
  currentMessage,
  previousMessageId, // Destructure
  nextMessageId,   // Destructure
}: MessageViewClientProps) {

  // --- HOOKS ---
  const router = useRouter();
  const params = useParams(); // Get folder from URL for navigation

  const { toast } = useToast();
    const { data: session } = useSession(); // Get session data


  // --- STATE ---  
  const [threadMessages, setThreadMessages] = useState<Message[]>(initialThreadMessages);

  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [showFullHeaders, setShowFullHeaders] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For actions like downloads
  const [editorMode, setEditorMode] = useState<"closed" | "reply" | "forward">("closed");

  // --- NEW: Get actions from the Zustand store ---
  const { addPendingRemovalId, removePendingRemovalId } = useMailStore();


  // --- DERIVED STATE ---
  const latestMessage = initialThreadMessages[initialThreadMessages.length - 1];
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);
  const currentUserEmail = session?.user?.email;


  // --- EFFECTS --- 
  useEffect(() => {
    setThreadMessages(initialThreadMessages);
    setOptimisticMessage(null); // Clear optimistic message on navigation
    if (initialThreadMessages.length > 0) {
      setExpandedMessages(new Set([initialThreadMessages[initialThreadMessages.length - 1]._id]));
    }
    setEditorMode("closed");
  }, [initialThreadMessages]);



  // --- UPDATED CORE ACTION HANDLER ---
  const handleAction = async (method: 'PATCH' | 'DELETE', body?: Record<string, any>, successMessage?: string) => {
    const messageId = latestMessage._id;
    const isRemovalAction = body?.folder === 'archive' || body?.folder === 'spam' || body?.folder === 'trash' || method === 'DELETE';

    // --- OPTIMISTIC UI LOGIC ---
    if (isRemovalAction) {
      // 1. Instantly update the global state.
      addPendingRemovalId(messageId);
      // 2. Immediately navigate back to the list. The list component will see the pending ID and hide the message.
      onBack();
    }

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("API request failed");

      // 3. On API SUCCESS:
      toast({ title: "Success", description: successMessage || "Action completed." });

      // Trigger a server data refresh to ensure consistency.
      router.refresh();

    } catch (error) {
      console.error("Action error:", error);
      toast({ title: "Error", description: "The requested action failed. Reverting.", variant: "destructive" });

      // 4. On API FAILURE (Rollback):
      // Remove the ID from the pending set. The list component will see this change and show the message again.
      removePendingRemovalId(messageId);
    }
  };

  const handleSent = (sentMessage: Message) => {
    setEditorMode("closed");
    toast({ title: "Success", description: "Your message has been sent." });
    
    // Optimistically add the new message to the thread
    setOptimisticMessage(sentMessage);

    // Refresh server data in the background for consistency
    router.refresh();
  };

  // --- SPECIFIC ACTION HANDLERS ---
  const onBack = () => {
    router.push(`/mail/${params.folder}`);
  }
  const onStar = () => handleAction('PATCH', { starred: !latestMessage.starred }, `Message ${latestMessage.starred ? 'unstarred' : 'starred'}.`);
  const onArchive = () => handleAction('PATCH', { folder: 'archive' }, "Message archived.");
  const markAsSpam = () => handleAction('PATCH', { folder: 'spam' }, "Message marked as spam.");
  const onDelete = () => handleAction('PATCH', { folder: 'trash' }, "Message moved to trash.");
  const markAsUnRead = async () => {
    // This is not a removal action, so we can handle it without optimistic navigation
    try {
      await fetch(`/api/messages/${latestMessage._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: false }),
      });
      toast({ title: "Success", description: "Message marked as unread." });
      onBack(); // Navigate back after success
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: "Could not mark as unread.", variant: "destructive" });
    }
  };

  const handleUnMarkSpam = () => handleAction('PATCH', { folder: 'inbox' }, "Message moved back to inbox.");
  const handleDeleteForever = () => handleAction('DELETE', undefined, "Message permanently deleted.");

  // onNext and onPrevious require server-side logic to determine the next/prev message ID.
  // This is a placeholder for that future implementation.
  const onNext = () => {
    if (nextMessageId) {
      // The folder comes from the URL parameters
      router.push(`/mail/${params.folder}/${nextMessageId}`);
    }
  };

  const onPrevious = () => {
    if (previousMessageId) {
      router.push(`/mail/${params.folder}/${previousMessageId}`);
    }
  };

  // --- UTILITY FUNCTIONS ---
  const toggleMessageExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    newExpanded.has(messageId) ? newExpanded.delete(messageId) : newExpanded.add(messageId);
    setExpandedMessages(newExpanded);
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      toast({
        title: "Info",
        description: `Downloading ${attachment.filename}...`,
      });

      // Call your API route securely
      const res = await fetch(`/api/attachments/${attachment._id}`, {
        method: "GET",
        credentials: "include", // ensures cookies/session are sent
      });

      if (!res.ok) {
        throw new Error(`Failed to download: ${res.statusText}`);
      }

      // Convert response to Blob
      const blob = await res.blob();

      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Cleanup
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `${attachment.filename} downloaded.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Download failed",
        variant: "destructive",
      });
    }
  };

  const printMessage = () => {
    // This client-side print function is acceptable
    const printContent = `<h2>${latestMessage.subject}</h2><p><strong>From:</strong> ${latestMessage.from}</p>${latestMessage.html}`;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // --- SUB-COMPONENTS / RENDER FUNCTIONS ---
  const getPriorityBadge = (priority?: string) => {
    if (priority === 'high') return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><ExclamationTriangleIcon className="h-3 w-3 mr-1" />High Priority</span>;
    if (priority === 'low') return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Low Priority</span>;
    return null;
  };

    const renderMessage = (msg: Message, isThread: boolean) => {
    const isExpanded = expandedMessages.has(msg._id);
    const fromName = formatDisplayName(msg.from, currentUserEmail);
    const toNames = msg.to.map(p => formatDisplayName(p, currentUserEmail)).join(", ");

    return (
      <div key={msg._id} className="border rounded-lg mb-4">
        <div className={`p-4 cursor-pointer hover:bg-gray-50 ${isExpanded ? "border-b" : ""}`} onClick={() => isThread && toggleMessageExpansion(msg._id)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">{fromName.charAt(0).toUpperCase()}</div>
              <div>
                <p className="text-sm font-medium text-gray-900">{fromName}</p>
                <p className="text-xs text-gray-500">To: {toNames}</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
          </div>
        </div>


        {isExpanded && (
          <div className="p-4">
            {msg.folder === "spam" && <SpamBanner onMarkNotSpam={handleUnMarkSpam} />}
            <EmailViewer html={msg.html} isSpam={msg.folder === "spam"} />

            {msg.attachments?.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-2">Attachments</h4>
                {msg.attachments.map((att) => (
                  <button key={att._id} onClick={() => downloadAttachment(att)} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 w-full text-left">
                    <PaperClipIcon className="h-4 w-4 text-gray-500" />
                    <span>{att.filename} ({Math.round(att.size / 1024)} KB)</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- MAIN RENDER ---
  if (!latestMessage) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading thread...</div>;
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          {/* Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button onClick={onBack} title="Go back" className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="h-5 w-5 text-gray-500" /></button>

            {/* Contextual Buttons */}
            {latestMessage.folder === 'inbox' && <button title="Archive" onClick={onArchive} className="p-2 hover:bg-gray-100 rounded-full"><Archive className="h-4 w-4 text-gray-500" /></button>}
            {latestMessage.folder !== 'spam' && latestMessage.folder !== 'trash' && <button title="Mark as spam" onClick={markAsSpam} className="p-2 hover:bg-gray-100 rounded-full"><OctagonAlert className="h-4 w-4 text-gray-500" /></button>}
            {latestMessage.folder !== 'trash' && <button title="Delete" onClick={onDelete} className="p-2 hover:bg-gray-100 rounded-full"><TrashIcon className="h-4 w-4 text-gray-500" /></button>}

            {latestMessage.folder === 'spam' && <button title="Not spam" onClick={handleUnMarkSpam} className="p-2 hover:bg-gray-100 rounded-full text-sm">Not Spam</button>}
            {(latestMessage.folder === 'spam' || latestMessage.folder === 'trash') && <button title="Delete forever" onClick={handleDeleteForever} className="p-2 hover:bg-gray-100 rounded-full text-sm text-red-600">Delete Forever</button>}

            <div className="bg-gray-200 w-px h-5"></div>

            <button title="Mark as unread" onClick={markAsUnRead} className="p-2 hover:bg-gray-100 rounded-full"><MailMinus className="h-4 w-4 text-gray-500" /></button>
            <button title="Star" onClick={onStar} className="p-2 hover:bg-gray-100 rounded-full">
              {latestMessage.starred ? <StarIconSolid className="h-5 w-5 text-yellow-500" /> : <StarIcon className="h-5 w-5 text-gray-500" />}
            </button>

            <Dropdown
              trigger={<button title="More options" className="p-2 hover:bg-gray-100 rounded-full"><EllipsisVerticalIcon className="h-5 w-5 text-gray-500" /></button>}
              items={[
                { label: "Reply", onClick: () => setEditorMode("reply"), icon: ArrowUturnLeftIcon },
                { label: "Forward", onClick: () => setEditorMode("forward"), icon: ArrowUturnRightIcon },
                { label: "Print", onClick: printMessage, icon: PrinterIcon },
              ]}
            />
          </div>

          {/* --- UPDATED PAGINATION CONTROLS --- */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {/* Show only if there are messages to count */}
              {totalMessages > 0 ? `${currentMessage} of ${totalMessages}` : ''}
            </span>
            <button
              onClick={onPrevious}
              disabled={!previousMessageId}
              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              disabled={!nextMessageId}
              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        <h2 className="text-xl font-semibold text-gray-900 truncate">{latestMessage.subject}</h2>
      </div>

      {/* Messages */}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {threadMessages.map((msg) => renderMessage(msg, threadMessages.length > 1))}

        {/* --- OPTIMISTIC MESSAGE RENDER --- */}
        {optimisticMessage && renderMessage(optimisticMessage, true)}

        {/* --- INLINE COMPOSER LOGIC --- */}
        {editorMode === "closed" && (
          <div className="flex items-center gap-3 pt-4">
            <button onClick={() => setEditorMode("reply")} className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"><ArrowUturnLeftIcon className="h-4 w-4" /><span>Reply</span></button>
            <button onClick={() => setEditorMode("forward")} className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"><ArrowUturnRightIcon className="h-4 w-4" /><span>Forward</span></button>
          </div>
        )}

        {editorMode !== "closed" && (
          <div className="mt-6">
            <InlineReplyComposer
              originalMessage={latestMessage}
              composeMode={editorMode}
              onClose={() => setEditorMode("closed")}
              onSent={handleSent} // <-- Use the enhanced handler
            />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}