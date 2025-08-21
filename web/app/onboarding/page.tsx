// /app/onboarding/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SessionUser } from "@/types";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient"; // We will create this

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  // If the user isn't logged in, send them to the login page.
  if (!user) {
    redirect("/auth/login?callbackUrl=/onboarding");
  }

  // If the user HAS completed onboarding, don't let them see this page again.
  // Redirect them straight to their mail.
  if (user.onboarding?.completed) {
    redirect("/mail/inbox");
  }

  // If they are logged in and need to onboard, render the interactive client UI.
  return <OnboardingClient />;
}