import {AdminSidebar} from "@/components/admin/AdminSidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SessionUser } from "@/types";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  // --- SERVER-SIDE AUTHENTICATION GUARD ---
  if (!user || !["owner", "admin"].includes(user.role)) {
    // Redirect non-admins away
    redirect("/mail/inbox?error=access_denied");
  }

  // If authorized, render the layout with the server-aware sidebar
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}