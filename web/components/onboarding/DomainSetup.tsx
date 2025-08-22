// components/onboarding/DomainSetup.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SessionUser } from "@/types";
import { ArrowRightIcon, CheckIcon, GlobeAltIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { LoaderCircle } from "lucide-react";

interface DomainSetupProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
  user: SessionUser;
}

export default function DomainSetup({ onNext, onPrevious, user }: DomainSetupProps) {
  const [selection, setSelection] = useState<'ditmail' | 'custom' | null>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for fetching and holding an existing domain
  const [existingDomain, setExistingDomain] = useState<any>(null);
  const [isDomainLoading, setIsDomainLoading] = useState(true);

  const username = user.username.replace(/[^a-z0-9]/gi, '');
  const userHasDitmail = user.email.endsWith('@ditmail.online');

  // Fetch existing domain when the component mounts
  useEffect(() => {
    const fetchDomain = async () => {
      setIsDomainLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        // If there's no token, we can't fetch a domain.
        if (!token) return;

        const response = await fetch("/api/domains", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const domainData = await response.json();
          // If domain data exists, pre-populate the form
          if (domainData && domainData.domain) {
            setExistingDomain(domainData);
            setCustomDomain(domainData.domain.domain || "");
            setSelection('custom');
          }
        }
        // No need to handle error response explicitly,
        // as the absence of a domain is a valid state.
      } catch (error: any) {
        console.error("Error fetching domain:", error);
        setError("Could not check for an existing domain.");
      } finally {
        setIsDomainLoading(false);
      }
    };

    fetchDomain();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selection) return;
    setLoading(true);
    setError(null);

    if (selection === 'ditmail') {
      const email = userHasDitmail ? user.email : `${username}@ditmail.online`;
      // In a real app, you might call an API to reserve this address
      onNext({ domain: null, userEmail: email });
      setLoading(false);
      return;
    }
    
    if (selection === 'custom') {
      // If the domain was pre-fetched, just continue to the next step.
      if (existingDomain) {
        onNext({ domain: existingDomain });
        setLoading(false);
        return;
      }

      // Validate the custom domain format
      const regex = /^(?!:\/\/)([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}$/;
      if (!regex.test(customDomain)) {
        setError("Please enter a valid domain name (e.g., yourcompany.com)");
        setLoading(false);
        return;
      }
      
      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch("/api/domains", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ domain: customDomain.toLowerCase().trim() }),
        });
        
        if (response.ok) {
          const domainData = await response.json();
          onNext({ domain: domainData });
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to add domain.");
        }
      } catch(err: any) {
        console.error("Error adding domain:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSkip = () => {
    onNext({ domain: null });
  };

  if (isDomainLoading) {
      return (
          <div className="flex justify-center items-center h-64">
              <LoaderCircle className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
      );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <GlobeAltIcon className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose your email address</h2>
        <p className="text-gray-500">Use a free DITMail address or connect your own domain.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
        {/* Option 1: DITMail.online Address */}
        {!userHasDitmail && (
          <motion.div
            onClick={() => setSelection('ditmail')}
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${selection === 'ditmail' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Use a free DITMail address</h3>
                <p className="text-sm text-blue-600">{username}@ditmail.online</p>
              </div>
              {selection === 'ditmail' && <CheckIcon className="w-6 h-6 text-blue-600" />}
            </div>
            <p className="text-xs text-gray-500 mt-2">Get started immediately. Includes 5GB of storage, forever free.</p>
          </motion.div>
        )}
        
        {/* Option 2: Custom Domain */}
        <motion.div
            onClick={() => {
                if (!existingDomain) setSelection('custom');
            }}
            className={`p-6 border-2 rounded-lg transition-all ${selection === 'custom' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'} ${!existingDomain && 'cursor-pointer hover:border-gray-400'}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-800">Use your own domain</h3>
                    <p className="text-sm text-gray-500">e.g., yourname@yourcompany.com</p>
                </div>
                {selection === 'custom' && <CheckIcon className="w-6 h-6 text-blue-600" />}
            </div>
             {selection === 'custom' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                    <input
                        type="text"
                        value={customDomain}
                        onChange={(e) => {
                            setCustomDomain(e.target.value.toLowerCase().trim());
                            setError(null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        placeholder="yourcompany.com"
                        onClick={(e) => e.stopPropagation()}
                        disabled={!!existingDomain}
                    />
                    {error && 
                        <div className="mt-2 text-sm text-red-600 flex items-center">
                            <ExclamationTriangleIcon className="inline w-4 h-4 mr-1.5" />
                            {error}
                        </div>
                    }
                </motion.div>
            )}
        </motion.div>

        <div className="pt-4 flex justify-between items-center">
            <button type="button" onClick={onPrevious} className="text-sm font-semibold text-gray-600 hover:text-gray-800">Back</button>
            <div>
              <button type="button" onClick={handleSkip} className="text-sm font-semibold text-gray-600 hover:text-gray-800 mr-4">Skip for now</button>
              <button
                type="submit"
                disabled={loading || !selection || (selection === 'custom' && !customDomain)}
                className="group inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg disabled:opacity-50 transition-all"
              >
                {loading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Continue'}
                {!loading && <ArrowRightIcon className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />}
              </button>
            </div>
        </div>
      </form>
    </motion.div>
  );
}