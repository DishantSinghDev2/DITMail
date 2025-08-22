// /app/mail/layout.tsx
import { MailSidebar } from "@/components/mail/MailSidebar";
import { Header } from "@/components/mail/Header";
import { Composer } from "@/components/mail/Composer";
import { Toaster } from "@/components/ui/toaster";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SessionUser } from "@/types";
import { ComposerSyncProvider } from "@/components/mail/ComposerSyncProvider"; // <-- IMPORT
import { connectDB } from "@/lib/db";
import User from "@/models/User";


export default async function MailLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  // ==> 1. Check for a valid session on the SERVER.
  if (!user) {
    // If no user, redirect to login, remembering they wanted to go to the inbox.
    const callbackUrl = encodeURIComponent("/mail/inbox");
    redirect("/api/auth/signin/wyi"); // NextAuth handles provider signin
  }
  await connectDB()
  const userDB = await User.findById({ _id: user.id })
  if (!userDB?.onboarding?.completed) {
    // If they haven't finished onboarding, send them there.
    redirect("/onboarding");
  }

  // ==> 3. Check for role-based access on the SERVER.
  if (!userDB.mailboxAccess && userDB.role !== "user") {
    // If they are an admin without mailbox access, send them to the admin panel.
    redirect("/admin");
  }

  // If all checks pass, render the full mail UI.
  return (
    <div className="h-screen w-screen flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <MailSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <ComposerSyncProvider>
            {children}
          </ComposerSyncProvider>
        </main>
      </div>
      <Toaster />
      <Composer />
    </div>
  );
}