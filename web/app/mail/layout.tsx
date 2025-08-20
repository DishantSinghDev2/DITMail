
import { MailSidebar } from "@/components/mail/MailSidebar";
import { Header } from "@/components/mail/Header";
import { Composer } from "@/components/mail/Composer";
import { Toaster } from "@/components/ui/toaster";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function MailLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/mail/inbox");
  }
  // ... (Your other session checks for onboarding, etc.)

  return (
    <div className="h-screen w-screen flex bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
      <MailSidebar /> {/* No props needed anymore */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <Toaster />
      <Composer />
    </div>
  );
}