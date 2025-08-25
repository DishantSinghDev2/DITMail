// /components/admin/DomainsPageClient.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PlusIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { IDomain } from '@/models/Domain'; // Import your Mongoose model interface for type safety
import { DomainVerificationModal } from './DomainVerificationModal'; // New modal component
import { Loader2 } from 'lucide-react';

// Client-safe version of IDomain
interface AdminDomain extends Omit<IDomain, 'org_id' | 'created_at' | 'dkim_private_key'> {
  _id: string;
  org_id: string;
  created_at: string; // Dates should be serialized to string for client components
  // dkim_private_key should NOT be sent to client
}

interface DomainsPageClientProps {
  initialDomains: AdminDomain[];
}

export function DomainsPageClient({ initialDomains }: DomainsPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [domains, setDomains] = useState<AdminDomain[]>(initialDomains);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedDomainForVerification, setSelectedDomainForVerification] = useState<AdminDomain | null>(null);

  // Update domains state when initialDomains prop changes (e.g., after router.refresh())
  useEffect(() => {
    setDomains(initialDomains);
  }, [initialDomains]);

  const handleAddDomain = async () => {
    if (!newDomainName.trim()) {
      toast({ title: "Error", description: "Domain name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsAddingDomain(true);
    try {
      // Reusing your existing /api/domains POST endpoint
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomainName.toLowerCase().trim() }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Domain added successfully. Please verify its DNS records.", variant: "default" });
        setNewDomainName('');
        setIsAddModalOpen(false);
        router.refresh(); // Trigger server component to re-fetch and pass updated data
      } else {
        const errorData = await res.json();
        toast({ title: "Error", description: errorData.error || "Failed to add domain.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error adding domain:", error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsAddingDomain(false);
    }
  };

  const openVerificationModal = (domain: AdminDomain) => {
    setSelectedDomainForVerification(domain);
    setIsVerifyModalOpen(true);
  };

  const handleVerificationModalClose = () => {
    setIsVerifyModalOpen(false);
    setSelectedDomainForVerification(null);
    router.refresh(); // Always refresh to reflect potential verification status changes
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Domain Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your organization's custom domains.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          <PlusIcon className="h-5 w-5 mr-2" /> Add New Domain
        </Button>
      </div>

      <div className="space-y-4">
        {domains.length === 0 ? (
          <Card className="p-6 text-center text-gray-500 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700">
            No domains configured yet. Click "Add New Domain" to get started.
          </Card>
        ) : (
          domains.map((domain) => (
            <Card key={domain._id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center space-x-4 mb-3 md:mb-0">
                {domain.status === 'verified' && <CheckCircleIcon className="h-6 w-6 text-green-500" />}
                {domain.status === 'pending' && <ClockIcon className="h-6 w-6 text-yellow-500" />}
                {domain.status === 'failed' && <XCircleIcon className="h-6 w-6 text-red-500" />}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{domain.domain}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status: <span className={`font-medium ${domain.status === 'verified' ? 'text-green-600' : domain.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>{domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}</span></p>
                </div>
              </div>
              <div className="flex space-x-2">
                {domain.status !== 'verified' && (
                  <Button onClick={() => openVerificationModal(domain)} variant="outline" className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-700">
                    Verify
                  </Button>
                )}
                {/* Potentially add an "Edit" or "Delete" button here */}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px] dark:bg-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Add New Domain</DialogTitle>
            <DialogDescription>
              Enter the domain name you want to connect to DITMail.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              id="domain-name"
              placeholder="example.com"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              className="col-span-3 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              disabled={isAddingDomain}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isAddingDomain} className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-700">Cancel</Button>
            <Button onClick={handleAddDomain} disabled={isAddingDomain || !newDomainName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isAddingDomain && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Domain Verification Modal */}
      {selectedDomainForVerification && (
        <Dialog open={isVerifyModalOpen} onOpenChange={setIsVerifyModalOpen}>
          <DomainVerificationModal
            domain={selectedDomainForVerification}
            onClose={handleVerificationModalClose}
          />
        </Dialog>
      )}
    </div>
  );
}