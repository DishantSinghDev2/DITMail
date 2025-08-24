import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getOrganizationUsers } from "@/lib/data/admin";
import { SessionUser } from "@/types";
import { UsersPageClient } from "@/components/admin/UsersPageClient";
import { Suspense } from "react";

interface PageProps {
  searchParams?: {
    search?: string;
  };
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser;
  const searchQuery = searchParams?.search || "";

  // The server fetches the initial user list based on the URL search parameter
  const users = await getOrganizationUsers(user.org_id, searchQuery);

  return (
    // The client component receives the server-fetched data as a prop
    <UsersPageClient initialUsers={users} />
  );
}