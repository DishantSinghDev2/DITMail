"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ui/use-toast";

const InfoRow = ({ label, value }: { label: string, value: string }) => {
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    toast({ description: `${label} copied to clipboard.` });
  };
  
  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-center space-x-2">
        <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{value}</p>
        <button onClick={copyToClipboard} title={`Copy ${label}`} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <DocumentDuplicateIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default function ConnectionSettings() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SMTP Settings</CardTitle>
          <CardDescription>Use these settings to send emails from other applications (e.g., Outlook, Gmail).</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-gray-200 dark:divide-gray-700">
          <InfoRow label="Server" value="smtp.ditmail.online" />
          <InfoRow label="Port" value="587" />
          <InfoRow label="Username" value={session?.user?.email || "your-email@domain.com"} />
          <InfoRow label="Password" value="Your account password" />
          <InfoRow label="Security" value="STARTTLS" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IMAP & POP3 Settings</CardTitle>
          <CardDescription>These features are coming soon and will allow you to sync your mailbox with other clients.</CardDescription>
        </CardHeader>
         <CardContent>
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-semibold text-gray-700 dark:text-gray-300">Coming Soon!</p>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}