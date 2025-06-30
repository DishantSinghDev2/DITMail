"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import copy from 'copy-to-clipboard';
import { useToast } from '@/hooks/use-toast';

interface Domain {
    _id: string;
    domain: string;
    org_id: { _id: string; name: string; plan_id: string; created_at: string; __v: number };
    dkim_verified: boolean;
    mx_verified: boolean;
    spf_verified: boolean;
    dmarc_verified: boolean;
    status: string;
    dkim_public_key: string;
    dkim_private_key: string;
    created_at: string;
    __v: number;
}

interface DNSRecords {
    txt: string;
    mx: string;
    spf: string;
    dkim: string;
    dmarc: string;
}

interface DomainVerificationProps {
    onNext: (data: any) => void;
    onPrevious: () => void;
    data: any
    user: any
    currentStep?: number;
}

interface VerificationResult {
    domain: Domain;
    verification: {
        txt: boolean;
        mx: boolean;
        spf: boolean;
        dkim: boolean;
        dmarc: boolean;
        details: {
            txt: string[];
            mx: string[];
            spf: string[];
            dkim: string[];
            dmarc: string[];
        };
    }
}

interface ParsedRecord {
    type: string;
    name: string;
    value: string;
    priority?: number; // Only for MX
}

// Helper function to parse DNS record strings
const parseDnsRecordString = (recordString: string): ParsedRecord | null => {
    if (!recordString) return null;

    const parts = recordString.split(/\s+/);
    if (parts.length < 4) return null; // Minimum parts: name IN TYPE value

    const name = parts[0];
    const type = parts[2]; // e.g., MX, TXT

    if (type === 'MX') {
        // e.g., khareeedlo.live IN MX 10 mx.freecustom.email.
        const priority = parseInt(parts[3], 10);
        const value = parts.slice(4).join(' ').replace(/\.$/, ''); // Remove trailing dot from MX value
        return { type, name, value, priority };
    } else if (type === 'TXT') {
        // e.g., khareeedlo.live IN TXT "v=spf1 mx include:smtp.freecustom.email -all"
        // The value is everything from the 4th part onwards, potentially quoted.
        let value = parts.slice(3).join(' ');
        // Remove leading/trailing quotes from TXT record values
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        return { type, name, value };
    }
    // Add other record types if needed, though for this context, MX and TXT are sufficient.
    return null;
};


const recordTypes = ['txt', 'mx', 'spf', 'dkim', 'dmarc'] as const;
type RecordType = typeof recordTypes[number];

export default function DomainVerification({ data, onNext, onPrevious, user, currentStep }: DomainVerificationProps) {
    const [verification, setVerification] = useState<VerificationResult | null>(null);
    const [dnsProvider, setDnsProvider] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);

    const { toast } = useToast();

    const { domain, dnsRecords: expDnsRecords } = data.domain;

    useEffect(() => {
        detectDnsProvider(domain.domain);
        verifyDomain(domain._id);
    }, [domain]);

    const detectDnsProvider = async (domainName: string) => {
        try {
            const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domainName}&type=NS`, {
                headers: { Accept: 'application/dns-json' },
            });
            const data = await res.json();
            const ns = data.Answer?.map((a: any) => a.data.toLowerCase()).join(', ');
            if (ns?.includes('cloudflare')) {
                setDnsProvider('Cloudflare');
            } else if (ns?.includes('google')) {
                setDnsProvider('Google Domains');
            } else if (ns?.includes('aws')) {
                setDnsProvider('AWS Route 53');
            } else if (ns?.includes('godaddy')) {
                setDnsProvider('GoDaddy');
            }
            else {
                setDnsProvider('Unknown');
            }
        } catch {
            setDnsProvider('Unknown');
        }
    };

    const verifyDomain = async (domainId: string) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get<VerificationResult>(`/api/domains/${domainId}/verify`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setVerification(res.data);
        } catch (err) {
            setError('Failed to verify domain. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        if (copy(text)) {
            toast({
                title: 'Copied to clipboard',
                description: 'The DNS record has been copied successfully.',
                variant: 'default',
            });
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Verify DNS Records for {domain.domain}</h1>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <p className="mb-4">Detected DNS Provider: <span className="font-medium">{dnsProvider}</span></p>

            <Tabs defaultValue="txt">
                <TabsList className="grid w-full grid-cols-5">
                    {recordTypes.map((record) => (
                        <TabsTrigger key={record} value={record} className="capitalize">
                            {record.toUpperCase()}
                            {verification && (
                                <span className={`ml-2 text-lg ${verification.verification[record] ? 'text-green-500' : 'text-red-500'}`}>
                                    {verification.verification[record] ? '✅' : '❌'}
                                </span>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {recordTypes.map((record) => (
                    <TabsContent key={record} value={record}>
                        <Card className="mt-4">
                            <CardContent className="p-4 space-y-6">
                                {/* Section: Required Record Configuration */}
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">Required {record.toUpperCase()} Record Configuration</h2>
                                    {(() => {
                                        const requiredRecord = parseDnsRecordString(expDnsRecords?.[record] || '');
                                        if (!requiredRecord) return <p className="text-gray-500">No required record information available.</p>;

                                        return (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[100px]">Type</TableHead>
                                                        <TableHead>Name/Host</TableHead>
                                                        <TableHead>Value/Content</TableHead>
                                                        {requiredRecord.type === 'MX' && <TableHead className="w-[80px]">Priority</TableHead>}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell className="font-medium">{requiredRecord.type}</TableCell>
                                                        <TableCell className="font-mono text-sm break-all">
                                                            <div className="flex items-center gap-2">
                                                                <span>{requiredRecord.name}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => copyToClipboard(requiredRecord.name)}
                                                                    aria-label="Copy Name"
                                                                >
                                                                    <Copy size={16} />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm break-all">
                                                            <div className="flex items-center gap-2">
                                                                <span>{requiredRecord.value}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => copyToClipboard(requiredRecord.value)}
                                                                    aria-label="Copy Value"
                                                                >
                                                                    <Copy size={16} />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        {requiredRecord.type === 'MX' && (
                                                            <TableCell className="font-mono text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span>{requiredRecord.priority}</span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => copyToClipboard(String(requiredRecord.priority))}
                                                                        aria-label="Copy Priority"
                                                                    >
                                                                        <Copy size={16} />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        );
                                    })()}
                                </div>

                                {/* Section: Current Verification Status */}
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">Current Verification Status</h2>
                                    <p className="font-medium mb-2">
                                        Status: {verification?.verification[record] ? '✅ Verified' : '❌ Not Verified'}
                                    </p>

                                    <div>
                                        <p className="font-medium mb-1">Live DNS Value(s) Detected:</p>
                                        <ul className="text-sm list-disc ml-5">
                                            {verification?.verification.details && (verification?.verification.details[record]?.length ?? 0) > 0 ? (
                                                verification?.verification.details[record]?.map((liveRecordStr, idx) => {
                                                    const parsedLiveRecord = parseDnsRecordString(liveRecordStr);
                                                    return parsedLiveRecord ? (
                                                        <li key={idx} className="flex items-center gap-2 mb-1">
                                                            <span className="font-mono break-all">
                                                                {parsedLiveRecord.name} {parsedLiveRecord.type} {parsedLiveRecord.priority ? `${parsedLiveRecord.priority} ` : ''}{parsedLiveRecord.value}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => copyToClipboard(liveRecordStr)}
                                                                aria-label="Copy Live Record"
                                                            >
                                                                <Copy size={14} />
                                                            </Button>
                                                        </li>
                                                    ) : (
                                                        <li key={idx} className="text-gray-500">Could not parse or unrecognized format: {liveRecordStr}</li>
                                                    );
                                                })
                                            ) : (
                                                <li className="text-gray-500">No live DNS records found.</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>

            <div className="mt-8 flex flex-wrap gap-4">
                <Button variant="outline" onClick={() => setIsGuidanceOpen(true)}>
                    How to add DNS records?
                </Button>
                <Button variant="outline" onClick={() => verifyDomain(domain._id)} disabled={loading}>
                    {loading ? 'Re-checking...' : 'Re-check Records'}
                </Button>
            </div>

            <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={onPrevious}>Previous</Button>
                <Button onClick={() => onNext({ domain: data.domain })}>Next</Button>
            </div>

            {/* DNS Guidance Dialog */}
            <Dialog open={isGuidanceOpen} onOpenChange={setIsGuidanceOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>How to Add DNS Records</DialogTitle>
                        <DialogDescription>
                            Follow these steps to add the necessary DNS records to your domain provider (e.g., Cloudflare, GoDaddy, Namecheap).
                            <br /><br />
                            <strong>General Steps:</strong>
                            <ol className="list-decimal pl-5 mt-2 space-y-1">
                                <li>Log in to your domain provider's control panel.</li>
                                <li>Navigate to the DNS management section (often labeled "DNS", "Zone Editor", or "DNS Records").</li>
                                <li>Add each of the following records:</li>
                            </ol>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        {recordTypes.map((recordType) => {
                            const requiredRecord = parseDnsRecordString(expDnsRecords?.[recordType] || '');
                            if (!requiredRecord) return null;

                            return (
                                <div key={recordType} className="border p-4 rounded-md">
                                    <h3 className="text-md font-semibold mb-2">{recordType.toUpperCase()} Record</h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]">Type</TableHead>
                                                <TableHead>Name/Host</TableHead>
                                                <TableHead>Value/Content</TableHead>
                                                {requiredRecord.type === 'MX' && <TableHead className="w-[80px]">Priority</TableHead>}
                                                <TableHead className="w-[50px] text-right">Copy</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">{requiredRecord.type}</TableCell>
                                                <TableCell className="font-mono text-sm break-all">
                                                    <div className="flex items-center gap-2">
                                                        <span>{requiredRecord.name}</span>
                                                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(requiredRecord.name)} aria-label="Copy Name">
                                                            <Copy size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm break-all">
                                                    <div className="flex items-center gap-2">
                                                        <span>{requiredRecord.value}</span>
                                                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(requiredRecord.value)} aria-label="Copy Value">
                                                            <Copy size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                {requiredRecord.type === 'MX' && (
                                                    <TableCell className="font-mono text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span>{requiredRecord.priority}</span>
                                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(String(requiredRecord.priority))} aria-label="Copy Priority">
                                                                <Copy size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => copyToClipboard(expDnsRecords?.[recordType] || '')}
                                                        aria-label="Copy full record"
                                                    >
                                                        <Copy size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <p className="text-sm text-gray-600 mt-2">
                                        <strong>Note:</strong> Some providers might require you to enter "@" for the root domain or omit the domain name if it's automatically appended (e.g., for <code>{domain.domain}</code> as the name, just enter <code>@</code> or leave blank). For subdomains like <code>default._domainkey</code> or <code>_dmarc</code>, just enter the subdomain part.
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}