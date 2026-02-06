import { useState, useEffect } from "react";
import { Mail, BarChart2 } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  type: string;
  name: string;
  subject: string;
  status: string;
}

interface CampaignStats {
  opens: number;
  unique_opens: number;
  clicks: number;
  unique_clicks: number;
  sends: number;
}

export default function CampaignStats() {
  const { activeAccount } = useAccount();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (activeAccount) {
        setLoading(true);
        setStats({}); // Clear old stats when account changes
        try {
          const response = await fetch('/api/activecampaign/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: activeAccount.apiKey, apiUrl: activeAccount.apiUrl }),
          });
          if (!response.ok) throw new Error('Failed to fetch campaigns');
          const data = await response.json();
          setCampaigns(data.campaigns || []);
        } catch (error) {
          toast({ title: "Error", description: "Could not fetch campaigns.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCampaigns();
  }, [activeAccount]);

  const fetchCampaignStats = async (campaignId: string) => {
    if (!activeAccount) return;
    setLoadingStats(campaignId);
    try {
      const response = await fetch(`/api/activecampaign/campaigns/${campaignId}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: activeAccount.apiKey, apiUrl: activeAccount.apiUrl }),
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(prev => ({ ...prev, [campaignId]: data.reportTotals }));
    } catch (error) {
      toast({ title: "Error", description: `Could not fetch stats for campaign.`, variant: "destructive" });
    } finally {
      setLoadingStats(null);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
        case "5": return <Badge variant="default" className="bg-green-600 text-white">Sent</Badge>;
        case "1": return <Badge variant="secondary">Draft</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Campaign Statistics</h1>
          <p className="text-muted-foreground">View open and click rates for your ActiveCampaign emails.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Campaigns</CardTitle>
          <CardDescription>Click "Fetch Stats" to see the performance of a campaign.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px] text-center">Sends</TableHead>
                  <TableHead className="w-[100px] text-center">Opens</TableHead>
                  <TableHead className="w-[100px] text-center">Clicks</TableHead>
                  <TableHead className="w-[150px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{campaign.subject}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell className="text-center font-mono">
                        {stats[campaign.id]?.sends ?? '...'}
                      </TableCell>
                       <TableCell className="text-center font-mono">
                        {stats[campaign.id]?.unique_opens ?? '...'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {stats[campaign.id]?.unique_clicks ?? '...'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchCampaignStats(campaign.id)}
                          disabled={loadingStats === campaign.id}
                        >
                          <BarChart2 className={cn("h-4 w-4 mr-2", loadingStats === campaign.id && "animate-spin")} />
                          Fetch Stats
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
           {!loading && campaigns.length === 0 && (
             <div className="text-center py-10 text-muted-foreground">
                No campaigns found for this account.
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}