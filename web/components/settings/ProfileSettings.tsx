"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { SessionUser } from "@/types";

// Note: The `user` prop is now mainly for initial display,
// but we'll use the live session for updates.
export default function ProfileSettings({ user }: { user: SessionUser }) {
  const { data: session, update } = useSession(); // Use next-auth session
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    theme: "light", // Assuming these preferences are stored elsewhere
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name,
      }));
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (formData.newPassword) {
      if (formData.newPassword.length < 8) newErrors.newPassword = "Password must be at least 8 characters";
      if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
      if (!formData.currentPassword) newErrors.currentPassword = "Current password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // API call should get the user from the session on the server
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update profile");

      // Update the client-side session to reflect name change
      await update({ name: formData.name });

      toast({ title: "Success", description: "Profile updated successfully." });
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (error: any) {
      setErrors({ general: error.message });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={user?.email || ""} disabled />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="currentPassword">Current Password</Label>
                 <Input id="currentPassword" type="password" value={formData.currentPassword} onChange={(e) => setFormData({...formData, currentPassword: e.target.value})} />
                 {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>}
               </div>
               <div className="space-y-2">
                 <Label htmlFor="newPassword">New Password</Label>
                 <Input id="newPassword" type="password" value={formData.newPassword} onChange={(e) => setFormData({...formData, newPassword: e.target.value})} />
                 {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
               </div>
               <div className="space-y-2">
                 <Label htmlFor="confirmPassword">Confirm Password</Label>
                 <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
                 {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
               </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
        </CardFooter>
      </Card>
    </form>
  );
}