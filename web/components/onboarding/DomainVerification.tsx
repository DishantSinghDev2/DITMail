// components/onboarding/DomainVerification.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from "framer-motion";
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react'; // <-- Use next-auth's hook for tokenless auth
import copy from 'copy-to-clipboard';
import { ArrowRightIcon, CheckCircleIcon, ClipboardCopyIcon, HelpCircleIcon, LoaderCircleIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- REACT ICONS IMPORTS ---
import { IconType } from 'react-icons';
import { SiCloudflare, SiGodaddy, SiGooglecloud, SiNamecheap, SiDigitalocean, SiVercel, SiNetlify } from 'react-icons/si';
import { FaAws, FaQuestionCircle } from 'react-icons/fa';
import { SessionUser } from '@/types'; // Your custom session user type

// --- Type Definitions ---
interface Domain { _id: string; domain: string; }
interface VerificationResult { verification: { [key in RecordType]: boolean }; }
interface ParsedRecord { type: string; name: string; value: string; priority?: number; }
const recordTypes = ['mx', 'spf', 'dkim', 'dmarc'] as const;
type RecordType = typeof recordTypes[number];

interface DomainVerificationProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
  data: { domain: { domain: Domain; dnsRecords: { [key: string]: string } } };
  user: SessionUser; // Pass the user from the parent
}

// --- Provider Detection Logic ---
interface ProviderInfo {
  name: string;
  Icon: IconType;
  color: string;
}

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
    const name = parts[0];
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

// --- Main Component ---
export default function DomainVerification({ data, onNext, onPrevious }: DomainVerificationProps) {
    const { data: session } = useSession(); // Use session for API calls
    const [verification, setVerification] = useState<VerificationResult['verification'] | null>(null);
    const [provider, setProvider] = useState<ProviderInfo>(DNS_PROVIDERS['unknown']);
    const [isVerifying, setIsVerifying] = useState(true);
    const { toast } = useToast();

        // --- THE FIX for Bug #2 ---
    // Safely destructure, providing a fallback empty object if dnsRecords is missing.
    const { domain, dnsRecords: requiredDnsRecords } = data?.domain || { domain: null, dnsRecords: {} };

    const recordsToConfigure = useMemo(() => {
        // Add a guard clause: if there are no required records, return an empty array.
        if (!requiredDnsRecords || Object.keys(requiredDnsRecords).length === 0) {
            return [];
        }
        return recordTypes.map(type => ({
            type,
            ...parseDnsRecord(requiredDnsRecords[type])
        })).filter(r => r.name);
    }, [requiredDnsRecords]);

    const isAllVerified = useMemo(() => {
        return verification && Object.values(verification).every(status => status === true);
    }, [verification]);
    
    // --- API & Side Effects ---
    const verifyDomain = useCallback(async () => {
        if (!session || !domain?._id) return; // Guard against missing data
        setIsVerifying(true);
        try {
            const res = await fetch(`/api/domains/${domain._id}/verify`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch verification status.');
            }
            const data: VerificationResult = await res.json();
            setVerification(data.verification);

            const allGood = Object.values(data.verification).every(v => v);
            if (allGood) {
                toast({
                    title: "All records verified! 🎉",
                    description: "Your domain is ready to send and receive email.",
                    variant: "default",
                });
            }
        } catch (err: any) {
            toast({
                title: "Verification Failed",
                description: err.message || "Could not check DNS records. Please try again.",
                variant: 'destructive',
            });
        } finally {
            setIsVerifying(false);
        }
    }, [domain._id, session, toast]);

    useEffect(() => {
        const detectDnsProvider = async (domainName: string) => {
            try {
                const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domainName}&type=NS`, { headers: { Accept: 'application/dns-json' } });
                const data = await res.json();
                const nsRecords = data.Answer?.map((a: any) => a.data.toLowerCase()).join(', ') || '';
                const foundProviderKey = Object.keys(DNS_PROVIDERS).find(key => nsRecords.includes(key));
                setProvider(DNS_PROVIDERS[foundProviderKey || 'unknown']);
            } catch {
                setProvider(DNS_PROVIDERS['unknown']);
            }
        };

        detectDnsProvider(domain.domain);
        verifyDomain(); // Initial verification
        
        const interval = setInterval(verifyDomain, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, [domain.domain, verifyDomain]);

    // --- Handlers ---
    const copyToClipboard = (text: string, field: string) => {
        if (copy(text)) {
            toast({ title: `Copied ${field}!` });
        }
    };

    const handleAutoConfigure = () => {
        const domainConnectUrl = `https://domainconnect.org/getting-started/`;
        window.open(domainConnectUrl, '_blank');
        toast({ title: "Redirecting to your provider...", description: "Follow their steps to apply settings automatically." });
    };

    return (
        <Dialog>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                        <span className="font-semibold text-gray-700 ml-1">{domain.domain}</span>.
                    </div>
                </div>

                <Card className="p-6 md:p-8 mb-8">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-800">Required DNS Records</h3>
                        <Button onClick={handleAutoConfigure} className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700">
                            <SparklesIcon className="w-4 h-4 mr-2" />
                            Configure Automatically
                        </Button>
                    </div>
                    <div className="space-y-6">
                        {recordsToConfigure.map(record => (
                            <div key={record.type} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        {isVerifying ? (
                                            <LoaderCircleIcon className="w-5 h-5 text-gray-400 animate-spin" />
                                        ) : verification?.[record.type] ? (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircleIcon className="w-5 h-5 text-green-500" /></motion.div>
                                        ) : (
                                            <div className="w-5 h-5 flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                        <span className="ml-3 font-medium text-gray-700 uppercase">{record.type} Record</span>
                                    </div>
                                    <DialogTrigger asChild>
                                        <Button variant="link" size="sm" className="text-xs h-auto py-0 px-1">How to add?</Button>
                                    </DialogTrigger>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                    {['name', 'value', 'priority'].map(field => {
                                        if (!record[field]) return null;
                                        const label = field === 'name' ? 'Hostname' : field.charAt(0).toUpperCase() + field.slice(1);
                                        return (
                                            <div key={field}>
                                                <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
                                                <div className="flex items-center bg-white border rounded-md mt-1">
                                                    <p className="flex-grow p-2 font-mono text-sm text-gray-800 break-all">{record[field]}</p>
                                                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(String(record[field]), label)} className="h-full text-gray-400 hover:text-blue-600">
                                                        <ClipboardCopyIcon className="w-4 h-4" />
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
                        <Button variant="outline" onClick={verifyDomain} disabled={isVerifying}>
                            {isVerifying && <LoaderCircleIcon className="w-4 h-4 mr-2 animate-spin" />}
                            Re-check Status
                        </Button>
                        <Button
                            onClick={() => onNext({ domain: data.domain })}
                            disabled={!isAllVerified}
                            className="group inline-flex items-center bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAllVerified ? 'Continue' : 'Waiting for Verification'}
                            <ArrowRightIcon className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
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
        </Dialog>
    );
}