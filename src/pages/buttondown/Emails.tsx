import { useState, useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ButtondownEmails() {
  const { activeAccount } = useAccount();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Analytics Dialog State
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (activeAccount) fetchEmails();
  }, [activeAccount]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/buttondown/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: activeAccount?.apiKey })
      });
      const data = await res.json();
      if (Array.isArray(data)) setEmails(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch emails", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openAnalytics = async (email: any) => {
    setSelectedEmail(email);
    setLoadingAnalytics(true);
    setAnalytics(null);
    try {
        const res = await fetch(`/api/buttondown/emails/${email.id}/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: activeAccount?.apiKey })
        });
        const data = await res.json();
        setAnalytics(data);
    } catch (err) {
        toast({ title: "Error", description: "Could not load stats", variant: "destructive" });
    } finally {
        setLoadingAnalytics(false);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sent Emails</CardTitle>
          <CardDescription>History of your newsletters.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow> :
               emails.length > 0 ? (
                emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">{email.subject}</TableCell>
                    <TableCell>{new Date(email.creation_date).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{email.status}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openAnalytics(email)}>
                            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center">No emails found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Analytics Modal */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Analytics: {selectedEmail?.subject}</DialogTitle>
                <DialogDescription>Performance metrics for this email.</DialogDescription>
            </DialogHeader>
            {loadingAnalytics ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : analytics ? (
                <div className="grid grid-cols-2 gap-4 py-4">
                    <StatBox label="Opens" value={analytics.opens} />
                    <StatBox label="Clicks" value={analytics.clicks} />
                    <StatBox label="Recipients" value={analytics.recipients} />
                    <StatBox label="Unsubscribes" value={analytics.unsubscriptions} />
                </div>
            ) : (
                <div className="py-4 text-center text-muted-foreground">No data available.</div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: number }) {
    return (
        <div className="border rounded p-4 text-center">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
}