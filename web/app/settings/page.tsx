"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"
import SettingsSidebar from "@/components/settings/SettingsSidebar"
import ProfileSettings from "@/components/settings/ProfileSettings"
import OrganizationSettings from "@/components/settings/OrganizationSettings"
import DomainSettings from "@/components/settings/DomainSettings"

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} user={user} />

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {activeTab === "profile" && <ProfileSettings user={user} />}
          {activeTab === "organization" && <OrganizationSettings user={user} />}
          {activeTab === "domains" && <DomainSettings user={user} />}
        </div>
      </div>
    </div>
  )
}
