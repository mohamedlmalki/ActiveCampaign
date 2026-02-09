import { useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Workflow, BarChart3, Loader2 } from "lucide-react";

interface Automation {
    workflowId: string;
    name: string;
    status: string; // "1" = Active
}

interface AutomationStats {
    subscriberStatistics: {
        totalEntrants: number;
        inProgressCount: number;
        completedCount: number;
    }
}

export default function Automations() {
  const { activeAccount } = useAccount();
  
  // State for Dialogs
  const [selectedAutoId, setSelectedAutoId] = useState<string | null>(null);

  // 1. Fetch Automations
  const { data: automations, isLoading } = useQuery({
    queryKey: ["ac-automations", activeAccount?.id],
    queryFn: async () => {
      if (!activeAccount) return [];
      const res = await fetch("/api/activecampaign/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: activeAccount.apiKey, apiUrl: activeAccount.apiUrl }),
      });
      return res.json() as Promise<Automation[]>;
    },
    enabled: !!activeAccount,
  });

  // 2. Fetch Stats (Enabled only when an ID is selected)
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["ac-auto-stats", selectedAutoId],
    queryFn: async () => {
        const res = await fetch(`/api/activecampaign/automations/${selectedAutoId}/stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: activeAccount?.apiKey, apiUrl: activeAccount?.apiUrl }),
        });
        return res.json() as Promise<AutomationStats>;
    },
    enabled: !!selectedAutoId && !!activeAccount,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Automations</h1>
          <p className="text-muted-foreground">Manage and monitor your ActiveCampaign Automations.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Active Workflows</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                        ) : automations?.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="text-center h-24">No automations found.</TableCell></TableRow>
                        ) : (
                            automations?.map((auto) => (
                                <TableRow key={auto.workflowId}>
                                    <TableCell className="font-medium">{auto.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={auto.status === "1" ? "default" : "secondary"}>
                                            {auto.status === "1" ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" size="icon"
                                            onClick={() => setSelectedAutoId(auto.workflowId)}
                                        >
                                            <BarChart3 className="h-4 w-4 text-primary" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

      {/* --- STATS DIALOG --- */}
      <Dialog open={!!selectedAutoId} onOpenChange={(open) => !open && setSelectedAutoId(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Automation Statistics</DialogTitle>
                <DialogDescription>Overview of subscriber activity.</DialogDescription>
            </DialogHeader>
            {isLoadingStats ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : stats ? (
                <div className="grid grid-cols-3 gap-4 text-center pt-4">
                    <div className="p-4 border rounded-lg bg-muted/20">
                        <div className="text-2xl font-bold">{stats.subscriberStatistics.totalEntrants}</div>
                        <div className="text-xs text-muted-foreground uppercase mt-1">Total Entrants</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">{stats.subscriberStatistics.inProgressCount}</div>
                        <div className="text-xs text-muted-foreground uppercase mt-1">In Progress</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-green-50/50 border-green-100">
                        <div className="text-2xl font-bold text-green-600">{stats.subscriberStatistics.completedCount}</div>
                        <div className="text-xs text-muted-foreground uppercase mt-1">Completed</div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 text-muted-foreground">No stats available</div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}