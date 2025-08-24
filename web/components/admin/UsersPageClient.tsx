"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import UserTable from "@/components/admin/UserTable";
import CreateUserModal from "@/components/admin/CreateUserModal";

export function UsersPageClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState(initialUsers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500); // Debounce input

  // This effect updates the URL when the user stops typing,
  // which triggers the parent Server Component to re-fetch data.
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearchTerm) {
      params.set("search", debouncedSearchTerm);
    } else {
      params.delete("search");
    }
    // No data fetching here! Just a URL update.
    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedSearchTerm, pathname, router, searchParams]);
  
  // This effect ensures the user list updates when the server sends new props
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // The onRefresh function now uses router.refresh() to re-run the server fetch
  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage organization users and permissions.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold"
        >
          Add User
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      {/* The table now receives the state managed by this client component */}
      <UserTable users={users} onRefresh={handleRefresh} />

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            handleRefresh(); // Refresh data after creation
          }}
        />
      )}
    </div>
  );
}