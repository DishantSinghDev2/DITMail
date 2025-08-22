// /app/mail/layout.tsx
import { MailSidebar } from "@/components/mail/MailSidebar";
import { Header } from "@/components/mail/Header";
import { Composer } from "@/components/mail/Composer";
import { Toaster } from "@/components/ui/toaster";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SessionUser } from "@/types";
import { ComposerSyncProvider } from "@/components/mail/ComposerSyncProvider";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export default async function MailLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    redirect("/api/auth/signin/wyi");
  }

  await connectDB();
  // Minor Fix: findById takes the ID directly, not an object.
  const userDB = await User.findById(user.id);

  // ==> THE FIX: Redirect if onboarding is NOT completed.
  if (!userDB?.onboarding?.completed) {
    redirect("/onboarding");
  }

  // This check is correct.
  if (!userDB.mailboxAccess && userDB.role !== "user") {
    redirect("/admin");
  }

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