"use client";

import { useState, useEffect } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Alias {
  _id: string;
  alias: string;
  destination: string[];
  domain_id: { domain: string };
  created_at: string;
}

export default function AliasesSettings() {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAliases = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/aliases");
        if (response.ok) {
          const data = await response.json();
          setAliases(data.aliases);
        }
      } catch (error) { console.error("Error fetching aliases:", error); }
      finally { setLoading(false); }
    };
    fetchAliases();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Aliases</CardTitle>
        <CardDescription>Forwarding addresses for your organization's domains.</CardDescription>
      </CardHeader>
      <CardContent>
        {aliases.length === 0 ? (
          <p className="text-sm text-center py-8 text-gray-500">No aliases are configured.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alias Email</TableHead>
                <TableHead>Forwards To</TableHead>
                <TableHead>Domain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aliases.map((alias) => (
                <TableRow key={alias._id}>
                  <TableCell className="font-medium">{alias.alias}</TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {alias.destination.map(dest => <Badge key={dest} variant="secondary">{dest}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>{alias.domain_id.domain}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter>
         <p className="text-xs text-center text-gray-500">Alias management is handled by your organization's administrators.</p>
      </CardFooter>
    </Card>
  );
}