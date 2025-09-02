// components/onboarding/OnboardingComplete.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoaderCircle } from "lucide-react";

export default function OnboardingComplete({onComplete, data}: {onComplete: (data: any) => Promise<void>, data: any}) {
  useEffect(() => {
    // We only want this to run ONCE when the component mounts.
    // The empty dependency array [] ensures this.
    console.log('inside the onboarding welcome')
    onComplete(data);

    // By adding the eslint-disable comment, we acknowledge that we are
    // intentionally not including `onComplete` and `data` in the
    // dependency array because we want to avoid re-triggering the effect
    // on parent re-renders. This is a valid use case for a one-time trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- THE KEY FIX: Use an empty dependency array.


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