// components/onboarding/OnboardingWelcome.tsx
"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon, RocketLaunchIcon, ShieldCheckIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { SessionUser } from "@/types";

interface OnboardingWelcomeProps {
  onNext: () => void;
  user: SessionUser;
}

const features = [
    { icon: RocketLaunchIcon, title: "Blazing Fast", description: "Navigate your inbox with unparalleled speed and efficiency." },
    { icon: ShieldCheckIcon, title: "Secure & Private", description: "Your data is protected with end-to-end encryption." },
    { icon: SparklesIcon, title: "AI Powered", description: "Smart features to help you manage email effortlessly." },
];

export default function OnboardingWelcome({ onNext, user }: OnboardingWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <h1 className="text-4xl font-bold text-gray-800 mb-3">
        Welcome to DITMail, {user?.name?.split(' ')[0]}!
      </h1>
      <p className="text-lg text-gray-500 mb-10">
        Let's set up your new professional email in just a couple of minutes.
      </p>

      <div className="grid md:grid-cols-3 gap-6 text-left mb-12">
          {features.map((feature, i) => (
              <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bg-white rounded-xl p-6 border"
              >
                  <feature.icon className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-gray-800 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
              </motion.div>
          ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        className="group inline-flex items-center justify-center bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
      >
        Let's Get Started
        <ArrowRightIcon className="w-5 h-5 ml-2 transform transition-transform group-hover:translate-x-1" />
      </motion.button>
    </motion.div>
  );
}