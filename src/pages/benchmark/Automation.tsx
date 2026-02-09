import { useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Workflow, BarChart3, Edit2, Loader2, Save } from "lucide-react";

interface Automation {
    workflowId: string;
    name: string;
    status: string; // "1" = Active
    contactCount: string;
    fromName: string;
}

interface ReportStep {
    stepId: string;
    subject: string;
    sends: number;
    opens: number;
    clicks: number;
    bounces: number;
}

export default function Automations() {
  const { activeAccount } = useAccount();
  const queryClient = useQueryClient();
  
  // State for Dialogs
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editingAuto, setEditingAuto] = useState<Automation | null>(null);
  const [newName, setNewName] = useState("");

  // 1. Fetch Automations
  const { data: automations, isLoading } = useQuery({
    queryKey: ["bm-automations", activeAccount?.id],
    queryFn: async () => {
      if (!activeAccount) return [];
      const res = await fetch("/api/benchmark/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: activeAccount.apiKey }),
      });
      return res.json() as Promise<Automation[]>;
    },
    enabled: !!activeAccount,
  });

  // 2. Fetch Report (Enabled only when a report ID is selected)
  const { data: reportData, isLoading: isLoadingReport } = useQuery({
    queryKey: ["bm-auto-report", selectedReportId],
    queryFn: async () => {
        const res = await fetch(`/api/benchmark/automations/${selectedReportId}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: activeAccount?.apiKey }),
        });
        return res.json() as Promise<ReportStep[]>;
    },
    enabled: !!selectedReportId && !!activeAccount,
  });

  // 3. Update From Name Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
        if (!editingAuto) return;
        const res = await fetch(`/api/benchmark/automations/${editingAuto.workflowId}/from-name`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                apiKey: activeAccount?.apiKey, 
                newFromName: newName 
            }),
        });
        if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => {
        toast({ title: "Success", description: "Automation updated successfully." });
        setEditingAuto(null);
        queryClient.invalidateQueries({ queryKey: ["bm-automations"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Automations</h1>
          <p className="text-muted-foreground">Manage and monitor your Benchmark Automations.</p>
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
                            <TableHead>From Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Contacts</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                        ) : automations?.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-24">No automations found.</TableCell></TableRow>
                        ) : (
                            automations?.map((auto) => (
                                <TableRow key={auto.workflowId}>
                                    <TableCell className="font-medium">{auto.name}</TableCell>
                                    <TableCell>{auto.fromName}</TableCell>
                                    <TableCell>
                                        <Badge variant={auto.status === "1" ? "default" : "secondary"}>
                                            {auto.status === "1" ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{auto.contactCount}</TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <Button 
                                            variant="ghost" size="icon" 
                                            onClick={() => { setEditingAuto(auto); setNewName(auto.fromName); }}
                                        >
                                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                        <Button 
                                            variant="ghost" size="icon"
                                            onClick={() => setSelectedReportId(auto.workflowId)}
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

      {/* --- REPORT DIALOG --- */}
      <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Automation Report</DialogTitle>
                <DialogDescription>Performance stats per email step.</DialogDescription>
            </DialogHeader>
            {isLoadingReport ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email Subject</TableHead>
                                <TableHead>Sends</TableHead>
                                <TableHead>Opens</TableHead>
                                <TableHead>Clicks</TableHead>
                                <TableHead>Bounces</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData?.map((step) => (
                                <TableRow key={step.stepId}>
                                    <TableCell className="font-medium">{step.subject}</TableCell>
                                    <TableCell>{step.sends}</TableCell>
                                    <TableCell className="text-green-600">{step.opens}</TableCell>
                                    <TableCell className="text-blue-600">{step.clicks}</TableCell>
                                    <TableCell className="text-red-600">{step.bounces}</TableCell>
                                </TableRow>
                            ))}
                            {reportData?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No data available</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            )}
        </DialogContent>
      </Dialog>

      {/* --- EDIT DIALOG --- */}
      <Dialog open={!!editingAuto} onOpenChange={(open) => !open && setEditingAuto(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Automation Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">From Name</label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <p className="text-xs text-muted-foreground">This name will appear as the sender for emails in this workflow.</p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingAuto(null)}>Cancel</Button>
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}