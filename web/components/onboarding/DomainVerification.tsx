'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

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
    domain: Domain;
    dnsRecords: DNSRecords;
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

const tabs = ['MX', 'SPF', 'DKIM', 'DMARC'];

export default function DomainVerification({ data, onNext, onPrevious }: DomainVerificationProps) {
  const [activeTab, setActiveTab] = useState('MX');
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [dnsProvider, setDnsProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { domain, dnsRecords } = data;

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
      const res = await axios.post<VerificationResult>(`/api/domain/${domainId}/verify`, {
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

  const recordMapping: { [key: string]: keyof DNSRecords } = {
    MX: 'mx',
    SPF: 'spf',
    DKIM: 'dkim',
    DMARC: 'dmarc',
  };

  const getStatus = (type: keyof VerificationResult) => {
    return verification?.[type] ? '✅ Verified' : '❌ Not Verified';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Domain Verification - {domain.domain}</h1>
      {error && <p className="text-red-500">{error}</p>}
      <p className="mb-2">DNS Provider: {dnsProvider}</p>

      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`mr-4 pb-2 ${
              activeTab === tab ? 'border-b-2 border-blue-600 font-bold' : ''
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="my-4">Checking records...</p>
      ) : (
        <div className="mt-6">
          <p className="mb-2 font-medium">Expected {activeTab} Record:</p>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
            {dnsRecords[recordMapping[activeTab]]}
          </pre>

          <p className="mt-4 font-medium">Propagation Status:</p>
          <p>{getStatus(recordMapping[activeTab] as keyof VerificationResult)}</p>

          {verification?.details[recordMapping[activeTab]]?.length > 0 && (
            <div className="mt-3">
              <p className="font-medium">Live DNS Results:</p>
              <ul className="list-disc list-inside text-sm">
                {verification.details[recordMapping[activeTab]].map((entry, idx) => (
                  <li key={idx}>{entry}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <button
          className="bg-yellow-500 text-white px-4 py-2 rounded"
          onClick={handleAddDnsRecords}
        >
          Add DNS Records
        </button>
        <button
          className="bg-gray-300 text-black px-4 py-2 rounded"
          onClick={() => verifyDomain(domain._id)}
        >
          Re-check Records
        </button>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          className="bg-gray-200 px-4 py-2 rounded"
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded"
          onClick={() => onNext({ domain })}
        >
          Next
        </button>
      </div>
    </div>
  );
}
