// /app/onboarding/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SessionUser } from "@/types";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  // If the user isn't logged in, redirect to login page
  if (!user) {
    redirect("/api/auth/signin/wyi"); // NextAuth handles provider signin
  }

  if (user?.onboarding?.completed) {
    redirect("/mail/inbox");
  }

  return <OnboardingClient />;
}
