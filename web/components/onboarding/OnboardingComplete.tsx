// components/onboarding/OnboardingComplete.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export default function OnboardingComplete({onComplete, data}: {onComplete: (data: any) => Promise<void>, data: any}) {
  const router = useRouter();

  useEffect(() => {
    // Navigate after the "Redirecting" message has been shown
    console.log('from onboard complete comp', data)
    onComplete(data)
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <AnimatePresence mode="wait">
          <motion.div
            key="redirecting-message"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center pt-10"
          >
            <LoaderCircle className="w-12 h-12 text-blue-600 animate-spin mb-6" />
            <p className="text-lg font-semibold text-gray-600">
              Redirecting to your inbox...
            </p>
          </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}