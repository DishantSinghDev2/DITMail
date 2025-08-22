// components/onboarding/OnboardingComplete.tsx
"use client";

import { motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";

export default function OnboardingComplete() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <CheckCircleIcon className="w-24 h-24 text-green-500 mx-auto mb-6" />
      <h1 className="text-4xl font-bold text-gray-800 mb-3">
        You're All Set!
      </h1>
      <p className="text-lg text-gray-500 mb-10">
        Your DITMail account has been successfully configured.
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/mail/inbox')}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
      >
        Go to My Inbox
      </motion.button>
    </motion.div>
  );
}