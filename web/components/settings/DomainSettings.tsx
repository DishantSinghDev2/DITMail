"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import LoadingSpinner from "../ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/solid";

interface Domain {
  _id: string;
  domain: string;
  status: "pending" | "verified" | "failed";
}

export default function DomainSettings() {
  const { data: session } = useSession();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDomains = async () => {
      if (!session?.user) return;
      setLoading(true);
      try {
        const response = await fetch("/api/domains"); // API will use the session to get the user
        if (response.ok) {
          const data = await response.json();
          setDomains(data);
        }
      } catch (error) {
        console.error("Error fetching domains:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDomains();
  }, [session]);

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domains</CardTitle>
        <CardDescription>Domains connected to your organization.</CardDescription>
      </CardHeader>
      <CardContent>
        {domains.length === 0 ? (
          <p className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">
            No domains are configured for this organization.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {domains.map((domain) => (
              <li key={domain._id} className="py-3 flex justify-between items-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{domain.domain}</p>
                <div className="flex items-center space-x-2">
                  {domain.status === "verified" ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ClockIcon className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className={`text-xs font-medium capitalize px-2 py-1 rounded-full ${domain.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {domain.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
         <p className="text-xs text-center pt-4 text-gray-500 dark:text-gray-400">
            Domain management is handled by your organization's administrators.
          </p>
      </CardContent>
    </Card>
  );
}