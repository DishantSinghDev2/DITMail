"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Session } from "next-auth"; // Use the correct Session type

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import ProfileSettings from "@/components/settings/ProfileSettings";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import DomainSettings from "@/components/settings/DomainSettings";
import LoadingSpinner from "../ui/LoadingSpinner";
import ConnectionSettings from "./ConnectionSettings";
import AliasesSettings from "@/components/settings/AliasesSettings";
import CatchAllSettings from "@/components/settings/CatchAllSettings";
import ContactsSettings from "@/components/settings/ContactsSettings";

interface SettingsDialogProps {
  userSession: Session; // Pass the whole session object
}

export function SettingsDialog({ userSession }: SettingsDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const settingsTab = searchParams.get("settings");
  
  // The dialog's open state is now derived directly from the URL.
  const isOpen = !!settingsTab;

  // The active tab is also derived from the URL, with a fallback.
  const activeTab = settingsTab || "profile";
  
  // We use the router to close the dialog. This keeps the URL in sync.
  const handleClose = () => {
    // Create a new URLSearchParams object from the current one
    const params = new URLSearchParams(searchParams.toString());
    // Remove the 'settings' parameter
    params.delete("settings");
    // Push the new URL state. We use router.push to update the history.
    router.push(`?${params.toString()}`);
  };
  
  // Render the currently active settings component
  const renderActiveTab = () => {
    if (!userSession?.user) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }

    switch (activeTab) {
      case "organization":
        return <OrganizationSettings user={userSession.user as any} />;
      case "connection": // Add the new case
        return <ConnectionSettings />;
      case "domains":
        return <DomainSettings user={userSession.user as any} />;
      case "aliases":
        return <AliasesSettings />;
      case "catch-all":
        return <CatchAllSettings />;
      case "contacts":
        return <ContactsSettings />;
      case "profile":
      default:
        return <ProfileSettings user={userSession.user as any} />;

    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full">
          {/* We pass the derived activeTab to the sidebar */}
          <SettingsSidebar activeTab={activeTab} user={userSession.user as any} />

          <div className="flex-1 overflow-y-auto">
            <DialogHeader className="p-6 border-b">
              <DialogTitle className="capitalize text-xl">
                {activeTab} Settings
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
                {renderActiveTab()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}