import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy } from 'lucide-react';

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
  mx: string;
  spf: string;
  dkim: string;
  dmarc: string;
}

interface DomainVerificationProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
  data: {
    domain: {
        domain: Domain;
        dnsRecords: DNSRecords;
    };
  };
}

interface VerificationResult {
  mx: boolean;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  details: {
    mx: string[];
    spf: string[];
    dkim: string[];
    dmarc: string[];
  };
}

const recordTypes = ['mx', 'spf', 'dkim', 'dmarc'] as const;
type RecordType = typeof recordTypes[number];

export default function DomainVerification({ data, onNext, onPrevious }: DomainVerificationProps) {
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [dnsProvider, setDnsProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { domain, dnsRecords } = data.domain;

  useEffect(() => {
    detectDnsProvider(domain.domain);
    verifyDomain(domain._id);
  }, [domain]);

  const detectDnsProvider = (domainName: string) => {
    if (domainName.includes('cloudflare')) {
      setDnsProvider('Cloudflare');
    } else {
      setDnsProvider('Unknown');
    }
  };

  const verifyDomain = async (domainId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.get<VerificationResult>(`/api/domain/${domainId}/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVerification(res.data);
    } catch (err) {
      setError('Failed to verify domain. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDnsRecords = () => {
    if (dnsProvider === 'Cloudflare') {
      window.open(`https://dash.cloudflare.com/`, '_blank');
    } else {
      alert('Please manually add DNS records at your DNS provider.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Verify DNS Records for {domain.domain}</h1>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <p className="mb-4">DNS Provider: {dnsProvider}</p>

      <Tabs defaultValue="mx">
        <TabsList>
          {recordTypes.map((record) => (
            <TabsTrigger key={record} value={record} className="capitalize">
              {record}
            </TabsTrigger>
          ))}
        </TabsList>

        {recordTypes.map((record) => (
          <TabsContent key={record} value={record}>
            <Card className="mt-4">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Expected {record.toUpperCase()} Record</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(dnsRecords?.[record] || '')}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {dnsRecords?.[record] || 'No record available'}
                </pre>

                <p className="font-medium">
                  Status: {verification?.[record] ? '✅ Verified' : '❌ Not Verified'}
                </p>

                <div>
                  <p className="font-medium mb-1">Live DNS Value(s):</p>
                  <ul className="text-sm list-disc ml-5">
                    {verification?.details?.[record]?.length ? (
                      verification.details[record].map((entry, i) => <li key={i}>{entry}</li>)
                    ) : (
                      <li>No DNS result found.</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-8 flex gap-4">
        <Button onClick={handleAddDnsRecords}>Add DNS Records</Button>
        <Button variant="outline" onClick={() => verifyDomain(domain._id)}>
          Re-check Records
        </Button>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onPrevious}>Previous</Button>
        <Button onClick={() => onNext({ domain, dnsRecords })}>Next</Button>
      </div>
    </div>
  );
}
