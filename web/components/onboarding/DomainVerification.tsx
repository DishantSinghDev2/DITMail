"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import copy from 'copy-to-clipboard';
import { ArrowRightIcon, CheckCircleIcon, ClipboardIcon, Loader2, LoaderCircleIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { IconType } from 'react-icons';
import { SiCloudflare, SiGodaddy, SiGooglecloud, SiNamecheap, SiDigitalocean, SiVercel, SiNetlify } from 'react-icons/si';
import { FaAws, FaQuestionCircle } from 'react-icons/fa';

// --- Type Definitions ---
interface Domain {
    _id: string;
    domain: string;
    verification_code: string;
    dkim_public_key: string;
    status: string; // Added status to the domain type
}
interface VerificationStatus {
    txt: boolean;
    mx: boolean;
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
}
interface ParsedRecord { type: string; name: string; value: string; priority?: number; }

const recordTypes: (keyof VerificationStatus)[] = ['txt', 'mx', 'spf', 'dkim', 'dmarc'];

interface DomainVerificationProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
  data: {
      domain: {
          domain: Domain;
          dnsRecords: { [key: string]: string };
      }
  };
}

// --- Provider Detection Logic ---
interface ProviderInfo { name: string; Icon: IconType; color: string; }
const DNS_PROVIDERS: { [key: string]: ProviderInfo } = {
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

// --- Helper Functions ---
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

// --- Animated Success Screen ---
const VerificationSuccessScreen = () => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="text-center py-20"
    >
        <div className="mx-auto w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <motion.circle
                    cx="50"
                    cy="50"
                    r="48"
                    stroke="#4ade80"
                    strokeWidth="4"
                    fill="none"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <motion.path
                    d="M30 50 L45 65 L70 40"
                    stroke="#4ade80"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.7, ease: "easeInOut", delay: 0.5 }}
                />
            </svg>
        </div>
        <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="text-3xl font-bold text-gray-800 mt-8 mb-2"
        >
            Domain Verified!
        </motion.h2>
        <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="text-gray-500"
        >
            Great! We're redirecting you to the next step...
        </motion.p>
    </motion.div>
);

// --- Main Component ---
export default function DomainVerification({ data, onNext, onPrevious }: DomainVerificationProps) {
    const { data: session } = useSession();
    const [verification, setVerification] = useState<VerificationStatus | null>(null);
    const [provider, setProvider] = useState<ProviderInfo>(DNS_PROVIDERS['unknown']);
    const [isVerifying, setIsVerifying] = useState(true);
    const [isFullyVerified, setIsFullyVerified] = useState(false);
    const { toast } = useToast();

    const domainData = data?.domain?.domain;
    const requiredDnsRecords = data?.domain?.dnsRecords || {};

    const recordsToConfigure = useMemo(() => {
        if (!requiredDnsRecords || Object.keys(requiredDnsRecords).length === 0) return [];
        return recordTypes.map(key => ({
            key,
            ...parseDnsRecord(requiredDnsRecords[key])
        })).filter(r => r && r.name);
    }, [requiredDnsRecords]);
    
    const verifyDomain = useCallback(async (isSilent = false) => {
        if (!session || !domainData?._id) return;
        if(!isSilent) setIsVerifying(true);

        try {
            const res = await fetch(`/api/domains/${domainData._id}/verify`);
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to check status.');
            
            const result: { domain: Domain; verification: VerificationStatus } = await res.json();
            
            if (result.domain.status === "verified") {
                if (!isSilent) {
                    toast({ title: "All records verified! 🎉", description: "Your domain is now active." });
                }
                setIsFullyVerified(true);
            } else {
                setVerification(result.verification);
            }
        } catch (err: any) {
            if (!isSilent) {
                 toast({ title: "Verification Check Failed", description: err.message, variant: 'destructive' });
            }
        } finally {
            if(!isSilent) setIsVerifying(false);
        }
    }, [domainData?._id, session, toast]);

    // Effect for auto-redirection on successful verification
    useEffect(() => {
        if (isFullyVerified) {
            const timer = setTimeout(() => {
                onNext({ domain: data.domain });
            }, 3000); // 3-second delay to show the animation
            return () => clearTimeout(timer);
        }
    }, [isFullyVerified, onNext, data.domain]);

    // Effect for initial setup and polling
    useEffect(() => {
        if (!domainData?.domain) return;
        
        const detectDnsProvider = async () => {
             try {
                const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domainData.domain}&type=NS`, { headers: { Accept: 'application/dns-json' } });
                const data = await res.json();
                const nsRecords = data.Answer?.map((a: any) => a.data.toLowerCase()).join(', ') || '';
                const foundProviderKey = Object.keys(DNS_PROVIDERS).find(key => nsRecords.includes(key));
                setProvider(DNS_PROVIDERS[foundProviderKey || 'unknown']);
            } catch { /* Fallback to unknown */ }
        };
        
        detectDnsProvider();
        verifyDomain(); // Initial check
        
        const interval = setInterval(() => verifyDomain(true), 30000); // Poll silently every 30 seconds
        return () => clearInterval(interval);
    }, [domainData?.domain, verifyDomain]);

    const copyToClipboard = (text: string, field: string) => {
        if (copy(text)) {
            toast({ title: `Copied ${field}!` });
        }
    };

    const handleAutoConfigure = () => {
        if (!domainData) return;
        const params = new URLSearchParams({
            domain: domainData.domain,
            verification_code: domainData.verification_code,
            dkim_public_key: domainData.dkim_public_key,
        });
        const domainConnectUrl = `https://domainconnect.org/v2/${domainData.domain}/mail.dishis.tech/ditmail?${params.toString()}`;
        window.open(domainConnectUrl, '_blank');
        toast({ title: "Redirecting to your provider...", description: "Follow the steps to apply settings automatically." });
    };

    if (!domainData) {
        return <div className="text-center text-red-500">Error: Domain data is missing. Please go back and try again.</div>
    }

    return (
        <Dialog>
             <AnimatePresence mode="wait">
                {isFullyVerified ? (
                    <VerificationSuccessScreen key="successScreen" />
                ) : (
                    <motion.div key="verificationForm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">Verify your domain</h2>
                            <div className="flex items-center justify-center text-gray-500">
                                Add these records at
                                <provider.Icon style={{ color: provider.color }} className="w-4 h-4 mx-1.5" />
                                <span className="font-semibold" style={{ color: provider.color }}>{provider.name}</span>
                                to activate
                                <span className="font-semibold text-gray-700 ml-1">{domainData.domain}</span>.
                            </div>
                        </div>

                        <Card className="p-6 md:p-8 mb-8">
                            <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-800">Required DNS Records</h3>
                                <Button onClick={handleAutoConfigure} className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Configure Automatically
                                </Button>
                            </div>
                            <div className="space-y-6">
                                {recordsToConfigure.map((record, i) => (
                                    <div key={i} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center">
                                                {isVerifying ? (
                                                    <LoaderCircleIcon className="w-5 h-5 text-gray-400 animate-spin" />
                                                ) : verification?.[record.key.toLowerCase() as keyof VerificationStatus] ? (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircleIcon className="w-5 h-5 text-green-500" /></motion.div>
                                                ) : (
                                                    <div className="w-5 h-5 flex items-center justify-center">
                                                        <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse"></div>
                                                    </div>
                                                )}
                                                <span className="ml-3 font-medium text-gray-700">
                                                    {record.key === 'txt' ? 'Ownership - TXT' : `${record.type} Record`}
                                                </span>
                                            </div>
                                            <DialogTrigger asChild><Button variant="link" size="sm" className="text-xs h-auto py-0 px-1">How-to</Button></DialogTrigger>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                            {['name', 'value', 'priority'].map(field => {
                                                const fieldValue = record[field as keyof ParsedRecord];
                                                if (!fieldValue) return null;
                                                const label = field === 'name' ? 'Hostname' : field.charAt(0).toUpperCase() + field.slice(1);
                                                return (
                                                    <div key={field}>
                                                        <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
                                                        <div className="flex items-center bg-white border rounded-md mt-1">
                                                            <p className="flex-grow p-2 font-mono text-sm text-gray-800 break-all">{String(fieldValue)}</p>
                                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(String(fieldValue), label)} className="h-full text-gray-400 hover:text-blue-600">
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

                        <div className="pt-4 flex justify-between items-center">
                            <Button variant="ghost" onClick={onPrevious}>Back</Button>
                            <div className="flex items-center space-x-4">
                                <Button variant="outline" onClick={() => verifyDomain()} disabled={isVerifying}>
                                    {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Re-check Status
                                </Button>
                                <Button
                                    disabled
                                    className="group inline-flex items-center bg-gray-400"
                                >
                                    Waiting for Verification...
                                </Button>
                            </div>
                        </div>
                        
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>How to Add a DNS Record</DialogTitle>
                                <DialogDescription>
                                    Log in to your domain provider ({provider.name}) and find the DNS management page. Add a new record with the exact Hostname and Value provided for each record type. DNS changes can take a few minutes to a few hours to propagate.
                                </DialogDescription>
                            </DialogHeader>
                        </DialogContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Dialog>
    );
}