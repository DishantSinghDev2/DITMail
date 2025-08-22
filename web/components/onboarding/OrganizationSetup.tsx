// components/onboarding/OrganizationSetup.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { LoaderCircle } from "lucide-react";

interface OrganizationSetupProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
  data: any;
}

export default function OrganizationSetup({ onNext, data }: OrganizationSetupProps) {
  const [orgName, setOrgName] = useState(data.organization?.name || "");
  const [isOrgNameLoading, setIsOrgNameLoading] = useState(true)

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await fetch("/api/organizations")

        if (response.ok) {
          const { organization } = await response.json()
          setOrgName(organization.name)
        } else {
          console.error("Failed to fetch organization details")
        }
      } catch (error) {
        console.error("Error fetching organization details:", error)
      } finally {
        setIsOrgNameLoading(false)
      }
    }

    fetchOrganization()
  }, [])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {

      const response = await fetch("/api/organizations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: orgName
        }),
      })

      if (response.ok) {
        const organization = await response.json()
        onNext({...data, organization })
      } else {
        throw new Error("Failed to create organization")
      }
    } catch (error) {
      console.error("Error creating organization:", error)
      alert("Failed to create organization. Please try again.")
    }
  }


  if (isOrgNameLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderCircle className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">What's your organization's name?</h2>
        <p className="text-gray-500">This will be used to identify your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <div className="mb-6">
          <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 sr-only">Organization Name</label>
          <input
            id="orgName"
            type="text"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full text-center text-lg px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Acme Corporation"
          />
        </div>

        <button
          type="submit"
          disabled={!orgName}
          className="w-full group inline-flex items-center justify-center bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          Continue
          <ArrowRightIcon className="w-5 h-5 ml-2 transform transition-transform group-hover:translate-x-1" />
        </button>
      </form>
    </motion.div>
  );
}