// /components/onboarding/OnboardingClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { SessionUser } from "@/types";

// --- IMPORT YOUR ACTUAL ONBOARDING STEP COMPONENTS ---
import OnboardingWelcome from "@/components/onboarding/OnboardingWelcome";
import OrganizationSetup from "@/components/onboarding/OrganizationSetup";
import DomainSetup from "@/components/onboarding/DomainSetup";
import DomainVerification from "@/components/onboarding/DomainVerification";
import UserSetup from "@/components/onboarding/UserSetup";
import ProfileSetup from "@/components/onboarding/ProfileSetup";
import OnboardingComplete from "@/components/onboarding/OnboardingComplete";

// Define the base structure of your onboarding steps
const baseSteps = [
  { id: "welcome", title: "Welcome", component: OnboardingWelcome },
  { id: "organization", title: "Organization", component: OrganizationSetup },
  { id: "domain", title: "Choose Your Email", component: DomainSetup },
  // NOTE: Verification and Users steps are now added/removed dynamically
  { id: "profile", title: "Your Profile", component: ProfileSetup },
  { id: "complete", title: "Setup Complete", component: OnboardingComplete },
];

export function OnboardingClient() {
  const router = useRouter();
  const { data: session, status, update } = useSession({ required: true });

  const [steps, setSteps] = useState(baseSteps);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [isCompleting, setIsCompleting] = useState(false); // <-- 1. Add this state guard


  const handleNext = useCallback((data?: any) => {
    let newOnboardingData = onboardingData;
    if (data) {
      newOnboardingData = { ...onboardingData, ...data };
      setOnboardingData(newOnboardingData);
    }

    // --- DYNAMIC STEP LOGIC ---
    const currentStepId = steps[currentStep].id;
    let nextSteps = [...steps]; // Create a mutable copy

    if (currentStepId === 'domain') {
      if (data?.domain?.domain) {
        // --- PATH 1: Custom Domain ---
        // User added a custom domain, so we need to add the verification and user setup steps.
        const verificationStep = { id: "domainVerification", title: "Verification", component: DomainVerification };
        const usersStep = { id: "users", title: "Invite Team", component: UserSetup };

        // Insert verification if not present
        if (!nextSteps.find(s => s.id === 'domainVerification')) {
          nextSteps.splice(currentStep + 1, 0, verificationStep);
        }
        // Insert user setup if not present
        if (!nextSteps.find(s => s.id === 'users')) {
          // Find the new index of domain verification to insert after it
          const verificationIndex = nextSteps.findIndex(s => s.id === 'domainVerification');
          nextSteps.splice(verificationIndex + 1, 0, usersStep);
        }

      } else {
        // --- PATH 2: DITMail.online (or Skip) ---
        // User chose the free email, so we REMOVE the verification and user setup steps.
        nextSteps = nextSteps.filter(step => step.id !== 'domainVerification' && step.id !== 'users');
      }
      setSteps(nextSteps);
    }

    if (currentStep < nextSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // If we are at the last step after filtering, complete the process
      handleComplete(newOnboardingData);
    }
  }, [currentStep, onboardingData, steps]); // Add dependencies

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async (finalData?: any) => {
    // ▼▼▼ THE FIX IS HERE ▼▼▼
    if (isCompleting) return; // <-- 2. If already running, do nothing.

    setIsCompleting(true); // <-- 3. Set the guard to true immediately.

    try {
      if (finalData?.userEmail) {
        const res = await fetch('/api/mail/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: finalData.userEmail, name: session?.user?.name })
        });
        if (res.ok) {
          // You can combine session updates to reduce re-renders
          await update({ email: finalData?.userEmail, mailboxAccess: true });
        } else {
          setIsCompleting(false); // Reset on failure
          return;
        }
      }

      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) throw new Error("Server failed to finalize onboarding.");

      await update({ onboarding: { completed: true } });

      router.push("/mail/inbox");

    } catch (error) {
      console.error("Onboarding completion error:", error);
      toast({
        title: "Oh no! Something went wrong.",
        description: "We couldn't save your final step. Please try again.",
        variant: "destructive",
      });
      setIsCompleting(false); // <-- 4. Reset the guard on error.
    }
  }, [isCompleting, router, session?.user?.name, update]); // Add dependencies for useCallback

  const CurrentStepComponent = steps[currentStep].component;

  const variants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-800">DITMail Setup</h1>
            <span className="text-sm font-medium text-gray-500">
              {steps[currentStep].id !== 'complete' ? `Step ${currentStep + 1} / ${steps.length}` : 'Done!'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="bg-blue-600 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      </header>

      <main className="pt-28 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CurrentStepComponent
                onNext={handleNext}
                onPrevious={handlePrevious}
                onComplete={handleComplete}
                data={onboardingData}
                user={session?.user as SessionUser}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}