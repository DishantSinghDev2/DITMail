// /components/admin/DomainVerificationModal.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from '@/hooks/use-toast';
import copy from 'copy-to-clipboard';
import { CheckCircleIcon, ClipboardIcon, Loader2, LoaderCircleIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { IconType } from 'react-icons';
import { SiCloudflare, SiGodaddy, SiGooglecloud, SiNamecheap, SiDigitalocean, SiVercel, SiNetlify } from 'react-icons/si';
import { FaAws, FaQuestionCircle } from 'react-icons/fa';
import { IDomain } from '@/models/Domain'; // Import your Mongoose model interface

// Adapting the Domain type for client-side usage (string for ObjectIds/Dates)
interface AdminDomain extends Omit<IDomain, 'org_id' | 'created_at' | 'dkim_private_key'> {
  _id: string;
  org_id: string;
  created_at: string;
  // dkim_private_key should NOT be sent to client
  // dnsRecords is fetched on demand within this modal
}

interface VerificationStatus {
    txt: boolean; mx: boolean; spf: boolean; dkim: boolean; dmarc: boolean;
}
interface ParsedRecord { type: string; name: string; value: string; priority?: number; }

const recordTypes: (keyof VerificationStatus)[] = ['txt', 'mx', 'spf', 'dkim', 'dmarc'];

interface DomainVerificationModalProps {
  domain: AdminDomain; // The specific domain to verify
  onClose: () => void; // Function to call when modal should close (e.g., to refresh parent list)
}

// Provider Detection Logic (reused from your existing component)
const DNS_PROVIDERS: { [key: string]: { name: string; Icon: IconType; color: string; } } = {
  'cloudflare': { name: 'Cloudflare', Icon: SiCloudflare, color: '#F38020' },
  'godaddy': { name: 'GoDaddy', Icon: SiGodaddy, color: '#1BDBDB' },
  'domains.google': { name: 'Google Domains', Icon: SiGooglecloud, color: '#4285F4' },
  'namecheap': { name: 'Namecheap', Icon: SiNamecheap, color: '#D42D2A' },
  'aws': { name: 'AWS Route 53', Icon: FaAws, color: '#FF9900' },
  'digitalocean': { name: 'DigitalOcean', Icon: SiDigitalocean, color: '#0080FF' },
  'vercel': { name: 'Vercel', Icon: SiVercel, color: '#000000' },
  'netlify': { name: 'Netlify', Icon: SiNetlify, color: '#00C7B7' },
  'unknown': { name: 'your domain provider', Icon: FaQuestionCircle, color: '#6B7280' }
};

// Helper Functions (reused from your existing component)
const parseDnsRecord = (recordString: string): ParsedRecord | null => {
    if (!recordString) return null;
    const parts = recordString.split(/\s+/);
    if (parts.length < 4) return null;
    const name = parts[0].replace(/\.$/, '');
    const type = parts[2];
    if (type === 'MX') {
        const priority = parseInt(parts[3], 10);
        const value = parts.slice(4).join(' ').replace(/\.$/, '');
        return { type, name, value, priority };
    } else if (type === 'TXT') {
        let value = parts.slice(3).join(' ');
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        return { type, name, value };
    }
    return null;
};


export function DomainVerificationModal({ domain, onClose }: DomainVerificationModalProps) {
    const { toast } = useToast();
    const [verification, setVerification] = useState<VerificationStatus | null>(null);
    const [provider, setProvider] = useState(DNS_PROVIDERS['unknown']);
    const [isVerifying, setIsVerifying] = useState(true);
    const [isFullyVerified, setIsFullyVerified] = useState(domain.status === 'verified');
    const [dnsRecords, setDnsRecords] = useState<{ [key: string]: string }>({}); // DNS records for this specific domain

    // Fetch DNS records for the specific domain when modal opens
    useEffect(() => {
      const fetchDomainRecords = async () => {
        try {
          // This API endpoint /api/domains/[id] is now designed to return dnsRecords
          const res = await fetch(`/api/domains/${domain._id}`);
          if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch domain details.');
          const data = await res.json(); // This data should contain 'dnsRecords'
          if (data.dnsRecords) {
            setDnsRecords(data.dnsRecords);
          } else {
            console.warn("API did not return dnsRecords for domain:", domain.domain);
            toast({ title: "Warning", description: "Could not retrieve full DNS records.", variant: "default" });
          }
        } catch (error) {
          console.error("Error fetching domain DNS records:", error);
          toast({ title: "Error", description: "Failed to load DNS records.", variant: "destructive" });
        }
      };
      fetchDomainRecords();
    }, [domain._id, domain.domain, toast]);


    const recordsToConfigure = useMemo(() => {
        if (Object.keys(dnsRecords).length === 0) return [];
        return recordTypes.map(key => ({
            key,
            ...parseDnsRecord(dnsRecords[key])
        })).filter(r => r && r.name);
    }, [dnsRecords]);

    const verifyDomain = useCallback(async (isSilent = false) => {
        if (!domain._id) return;
        if(!isSilent) setIsVerifying(true);

        try {
            // Reusing your existing verification endpoint
            const res = await fetch(`/api/domains/${domain._id}/verify`);
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to check status.');
            
            const result: { domain: AdminDomain; verification: VerificationStatus } = await res.json();
            
            if (result.domain.status === "verified") {
                if (!isSilent) toast({ title: "Success", description: "Domain is now verified! 🎉" });
                setIsFullyVerified(true);
                onClose(); // Close modal and trigger parent refresh
            } else {
                setVerification(result.verification);
            }
        } catch (err: any) {
            if (!isSilent) toast({ title: "Verification Check Failed", description: err.message, variant: 'destructive' });
        } finally {
            if(!isSilent) setIsVerifying(false);
        }
    }, [domain._id, toast, onClose]);

    // Initial check and polling
    useEffect(() => {
        if (!isFullyVerified && domain.domain) { // Only run if not yet verified and domain name is present
          const detectDnsProvider = async () => {
            try {
              const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain.domain}&type=NS`, { headers: { Accept: 'application/dns-json' } });
              const data = await res.json();
              const nsRecords = data.Answer?.map((a: any) => a.data.toLowerCase()).join(', ') || '';
              const foundProviderKey = Object.keys(DNS_PROVIDERS).find(key => nsRecords.includes(key));
              setProvider(DNS_PROVIDERS[foundProviderKey || 'unknown']);
            } catch { /* Fallback to unknown */ }
          };
          detectDnsProvider();
          verifyDomain(); // Initial check

          const interval = setInterval(() => verifyDomain(true), 30000); // Poll silently
          return () => clearInterval(interval);
        }
    }, [domain.domain, verifyDomain, isFullyVerified]);


    const copyToClipboard = (text: string, field: string) => {
        if (copy(text)) toast({ title: `Copied ${field}!` });
    };

    const handleAutoConfigure = () => {
        // Ensure verification_code and dkim_public_key are provided by the API
        if (!domain.verification_code || !domain.dkim_public_key) {
          toast({ title: "Error", description: "Missing domain verification details for auto-configuration.", variant: "destructive" });
          return;
        }
        const params = new URLSearchParams({
            domain: domain.domain,
            verification_code: domain.verification_code,
            dkim_public_key: domain.dkim_public_key,
        });
        const domainConnectUrl = `https://domainconnect.org/v2/${domain.domain}/mail.dishis.tech/ditmail?${params.toString()}`; // Adjust service ID
        window.open(domainConnectUrl, '_blank');
        toast({ title: "Redirecting...", description: "Follow the steps to apply settings automatically." });
    };

    return (
        <DialogContent className="max-w-xl overflow-y-auto max-h-screen">
            <DialogHeader>
                <DialogTitle>Verify Domain: {domain.domain}</DialogTitle>
                <DialogDescription>
                    Add these DNS records at your domain provider to activate email services for {domain.domain}.
                </DialogDescription>
            </DialogHeader>

            <AnimatePresence mode="wait">
                {isFullyVerified ? (
                    <motion.div
                        key="successScreen"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center py-8"
                    >
                        <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Domain Verified!</h2>
                        <p className="text-gray-600 dark:text-gray-400">Your domain is now active for DITMail.</p>
                    </motion.div>
                ) : (
                    <motion.div key="verificationForm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 py-4">
                        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
                            You'll need to update DNS records at
                            <provider.Icon style={{ color: provider.color }} className="w-4 h-4 mx-1.5" />
                            <span className="font-semibold" style={{ color: provider.color }}>{provider.name}</span>.
                        </div>

                        <Card className="p-4 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                            <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-gray-800 dark:text-white">Required DNS Records</h3>
                                <Button onClick={handleAutoConfigure} className="mt-2 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white" disabled={!domain.verification_code || !domain.dkim_public_key}>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Configure Automatically
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {recordsToConfigure.map((record, i) => (
                                    <div key={i} className="border-b border-gray-200 dark:border-gray-600 pb-4 last:border-b-0 last:pb-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center">
                                                {isVerifying ? (
                                                    <LoaderCircleIcon className="w-4 h-4 text-gray-400 animate-spin" />
                                                ) : verification?.[record.key.toLowerCase() as keyof VerificationStatus] ? (
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <div className="w-4 h-4 flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                                    </div>
                                                )}
                                                <span className="ml-2 font-medium text-gray-700 dark:text-gray-200">
                                                    {record.key === 'txt' ? 'Ownership - TXT' : `${record.type} Record`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg space-y-2 border dark:border-gray-700">
                                            {['name', 'value', 'priority'].map(field => {
                                                const fieldValue = record[field as keyof ParsedRecord];
                                                if (!fieldValue) return null;
                                                const label = field === 'name' ? 'Hostname' : field.charAt(0).toUpperCase() + field.slice(1);
                                                return (
                                                    <div key={field}>
                                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{label}</label>
                                                        <div className="flex items-center border dark:border-gray-600 rounded-md mt-1">
                                                            <p className="flex-grow p-1.5 font-mono text-sm text-gray-800 dark:text-gray-100 break-all">{String(fieldValue)}</p>
                                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(String(fieldValue), label)} className="h-full text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                                <ClipboardIcon className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <DialogFooter className="mt-6">
                <Button variant="outline" onClick={onClose} disabled={isVerifying} className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-700">
                    {isFullyVerified ? 'Done' : 'Close'}
                </Button>
                {!isFullyVerified && (
                  <Button onClick={() => verifyDomain()} disabled={isVerifying} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Re-check Status
                  </Button>
                )}
            </DialogFooter>
        </DialogContent>
    );
}