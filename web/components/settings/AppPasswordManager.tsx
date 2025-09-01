"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Trash2, PlusCircle, KeyRound, AlertTriangle, Copy } from 'lucide-react';

// Define the shape of the password object received from the API
interface AppPassword {
  _id: string;
  name: string;
  created_at: string;
  last_used?: string;
}

// Validation schema for the creation form
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(50),
  currentPassword: z.string().min(1, "Please enter your current password to continue."),
});

export function AppPasswordManager() {
  const { toast } = useToast();
  const [passwords, setPasswords] = useState<AppPassword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPasswordResult, setNewPasswordResult] = useState<{ name: string; password: string } | null>(null);
  const [passwordToDelete, setPasswordToDelete] = useState<AppPassword | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", currentPassword: "" },
  });

  // Fetch passwords from the API
  const fetchPasswords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings/app-passwords');
      if (!res.ok) throw new Error('Failed to load app passwords.');
      const data = await res.json();
      setPasswords(data.appPasswords);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswords();
  }, []);

  // Handle form submission for creating a new password
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const res = await fetch('/api/settings/app-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      
      setNewPasswordResult(data);
      setIsDialogOpen(false);
      fetchPasswords(); // Refresh the list
      form.reset();

    } catch (error) {
      toast({ title: "Creation Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  // Handle deletion of a password
  const handleDelete = async () => {
    if (!passwordToDelete) return;

    try {
        const res = await fetch(`/api/settings/app-passwords?id=${passwordToDelete._id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete the password.');

        toast({ title: "Success", description: "App password has been deleted." });
        setPasswordToDelete(null);
        fetchPasswords(); // Refresh the list
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Password copied to clipboard." });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">App Passwords</h3>
        <p className="text-sm text-muted-foreground">
          Use these passwords to access your account from third-party apps like Outlook or Thunderbird.
        </p>
      </div>
      <div className="border rounded-lg">
        <div className="p-4 flex justify-between items-center border-b">
            <p className="font-semibold">Generated Passwords</p>
            <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Generate New Password
            </Button>
        </div>
        <div className="p-4 space-y-4">
            {isLoading ? (
                <p>Loading...</p>
            ) : passwords.length === 0 ? (
                <p className="text-sm text-muted-foreground">You haven't generated any app passwords yet.</p>
            ) : (
                passwords.map(pw => (
                    <div key={pw._id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                            <p className="font-medium">{pw.name}</p>
                            <p className="text-xs text-muted-foreground">
                                Created on {format(new Date(pw.created_at), 'PPP')}
                                {pw.last_used && ` • Last used: ${format(new Date(pw.last_used), 'PPP')}`}
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setPasswordToDelete(pw)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Dialog for Generating a New Password */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate New App Password</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>App Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Outlook on my PC" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currentPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Current Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter your main account password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Generating..." : "Generate"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog to show the newly generated password */}
      <Dialog open={!!newPasswordResult} onOpenChange={() => setNewPasswordResult(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Your New Password for "{newPasswordResult?.name}"</DialogTitle></DialogHeader>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 space-y-2">
                <div className="flex items-center font-semibold">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Important: Copy this password now.
                </div>
                <p>This is the only time you will see this password. Store it in a safe place.</p>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-md">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <code className="flex-1 text-sm font-semibold">{newPasswordResult?.password}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(newPasswordResult?.password || '')}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
            <DialogFooter>
                <Button onClick={() => setNewPasswordResult(null)}>Done</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog to confirm deletion */}
      <Dialog open={!!passwordToDelete} onOpenChange={() => setPasswordToDelete(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Delete App Password?</DialogTitle></DialogHeader>
            <p>Are you sure you want to delete the app password named "<strong>{passwordToDelete?.name}</strong>"? Any application using this password will lose access.</p>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setPasswordToDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}