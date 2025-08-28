"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import LoadingSpinner from "../ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SessionUser } from "@/types";

interface Organization {
  name: string;
  description: string;
}

interface OrgUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

// User prop is for initial check, but we'll fetch based on the session's orgId
export default function OrganizationSettings({ user }: { user: SessionUser }) {
  const { data: session } = useSession();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!session?.user?.org_id) return;
      setLoading(true);
      try {
        const [orgRes, usersRes] = await Promise.all([
          fetch(`/api/organizations/${session.user.org_id}`),
          fetch(`/api/organizations/${session.user.org_id}/users`),
        ]);

        if (orgRes.ok) setOrganization(await orgRes.json());
        if (usersRes.ok) setUsers(await usersRes.json());

      } catch (error) {
        console.error("Error fetching organization data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrganizationData();
  }, [session]);

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  if (!organization) return <p>Could not load organization details.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{organization.name}</CardTitle>
          <CardDescription>{organization.description || "Organization details"}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            For administrative changes, please contact your organization's owner.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Users within your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((orgUser) => (
              <li key={orgUser._id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{orgUser.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{orgUser.email}</p>
                </div>
                <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full capitalize">
                  {orgUser.role}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}