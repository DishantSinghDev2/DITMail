"use client";

import { useState, useEffect } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "../ui/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Contact {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  lastContact?: string;
}

export default function ContactsSettings() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState<Omit<Contact, '_id'>>({ name: '', email: '', phone: '' });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/contacts");
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
      }
    } catch (error) { console.error("Error fetching contacts:", error); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async () => {
    if (!newContact.email) {
      toast({ title: "Error", description: "Email is required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to add contact");
      
      toast({ title: "Success", description: "Contact added." });
      document.getElementById('close-add-contact-dialog')?.click();
      setNewContact({ name: '', email: '', phone: '' });
      fetchContacts(); // Refresh list
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>Manage your personal and recently contacted email addresses.</CardDescription>
        </div>
        <Dialog>
            <DialogTrigger asChild>
                <Button>Add Contact</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Add New Contact</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input id="phone" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button id="close-add-contact-dialog" variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleAddContact} disabled={saving}>{saving ? "Saving..." : "Save Contact"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-center py-8 text-gray-500">You have no saved or recent contacts.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Contacted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact, idx) => (
                <TableRow key={contact.email + idx}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.lastContact ? formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true }) : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}