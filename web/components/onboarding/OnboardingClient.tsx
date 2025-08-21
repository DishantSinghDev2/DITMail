// /components/onboarding/OnboardingClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// --- Placeholder Step Components ---
// In your real app, these would be your detailed components like OrganizationSetup, etc.
const OnboardingStep = ({ title, onNext }: { title: string, onNext: () => void }) => (
  <div className="text-center">
    <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>
    <p className="text-gray-500 mb-8">This is a placeholder for the {title.toLowerCase()} step.</p>
    <button onClick={onNext} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
      Continue
    </button>
  </div>
);

const steps = [
  { id: "welcome", title: "Welcome to DITMail!" },
  { id: "organization", title: "Set Up Your Organization" },
  { id: "domain", title: "Connect Your Domain" },
  { id: "users", title: "Invite Your Team" },
  { id: "complete", title: "You're All Set!" },
];

export function OnboardingClient() {
  const router = useRouter();
  const { data: session, status } = useSession(); // Use next-auth's hook
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }), // Send a clear payload
      });
      if (!response.ok) {
        throw new Error("Server failed to complete onboarding.");
      }
      toast({ title: "Setup Complete!", description: "Redirecting you to your shiny new inbox..." });
      // Use router.push which is the standard in App Router client components
      router.push("/mail/inbox");
    } catch (error) {
      console.error("Onboarding completion error:", error);
      toast({
        title: "Oh no! Something went wrong.",
        description: "We couldn't save your progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  const variants = {
    enter: { opacity: 0, y: 20 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
        {/* Cute Mascot/Logo */}
        <div className="mb-8 text-5xl animate-bounce">💌</div>
        
        <div className="w-full max-w-2xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-8 border">
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between mb-1 text-xs font-medium text-gray-500">
                    <span>{steps[currentStep].title}</span>
                    <span>Step {currentStep + 1} of {steps.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>
            </div>

            {/* Animated Step Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                >
                   {/* Replace this with your actual step components */}
                   <OnboardingStep title={steps[currentStep].title} onNext={handleNext} />
                </motion.div>
            </AnimatePresence>
        </div>
        <p className="mt-8 text-xs text-gray-400">DITMail Onboarding Experience</p>
    </div>
  );
}