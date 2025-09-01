"use client";

import { useState, useEffect } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CatchAll {
  _id: string;
  destination: string;
  domain_id: { domain: string };
}

export default function CatchAllSettings() {
  const [catchAlls, setCatchAlls] = useState<CatchAll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatchAlls = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/catch-all");
        if (response.ok) {
          const data = await response.json();
          setCatchAlls(data.catchAlls);
        }
      } catch (error) { console.error("Error fetching catch-alls:", error); }
      finally { setLoading(false); }
    };
    fetchCatchAlls();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catch-All Rules</CardTitle>
        <CardDescription>Rules for handling emails sent to non-existent addresses on your domains.</CardDescription>
      </CardHeader>
      <CardContent>
        {catchAlls.length === 0 ? (
          <p className="text-sm text-center py-8 text-gray-500">No catch-all rules are configured.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Forwards To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catchAlls.map((rule) => (
                <TableRow key={rule._id}>
                  <TableCell className="font-medium">{rule.domain_id.domain}</TableCell>
                  <TableCell>{rule.destination}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
       <CardFooter>
         <p className="text-xs text-center text-gray-500">Catch-all management is handled by your organization's administrators.</p>
      </CardFooter>
    </Card>
  );
}