import { useState, useEffect } from "react";
import { UserPlus, Play, FileJson2, Pause, Play as PlayIcon, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount } from "@/contexts/AccountContext";
import { useToast } from "@/components/ui/use-toast"; // Changed to useToast
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useJobs } from "@/contexts/JobContext";

interface List {
    listId: string;
    name: string;
}

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export default function SingleUserImport() {
  const { activeAccount } = useAccount();
  const { toast } = useToast(); // Correct Hook Usage
  const { jobs, startJob, pauseJob, resumeJob, cancelJob } = useJobs();
  
  const activeJob = Object.values(jobs).find(job => job.accountId === activeAccount?.id);

  const [lists, setLists] = useState<List[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  // --- AUTO-LOAD DRAFT ---
  useEffect(() => {
    if (activeAccount) {
      const savedList = localStorage.getItem(`draft_ac_single_list_${activeAccount.id}`);
      const savedEmail = localStorage.getItem(`draft_ac_single_email_${activeAccount.id}`);
      const savedFname = localStorage.getItem(`draft_ac_single_fname_${activeAccount.id}`);
      const savedLname = localStorage.getItem(`draft_ac_single_lname_${activeAccount.id}`);

      if (savedList) setSelectedList(savedList);
      setFormData({
          email: savedEmail || "",
          firstName: savedFname || "",
          lastName: savedLname || ""
      });
    }
  }, [activeAccount]);

  // --- AUTO-SAVE DRAFT ---
  useEffect(() => {
    if (activeAccount) {
      if(selectedList) localStorage.setItem(`draft_ac_single_list_${activeAccount.id}`, selectedList);
      localStorage.setItem(`draft_ac_single_email_${activeAccount.id}`, formData.email);
      localStorage.setItem(`draft_ac_single_fname_${activeAccount.id}`, formData.firstName);
      localStorage.setItem(`draft_ac_single_lname_${activeAccount.id}`, formData.lastName);
    }
  }, [selectedList, formData, activeAccount]);

  // --- JOB COMPLETION TOAST ---
  useEffect(() => {
    if (activeJob?.status === 'completed') {
        toast({ 
            title: "Import Completed", 
            description: `Successfully processed ${activeJob.totalContacts} contact(s).`,
            variant: "default"
        });
    }
  }, [activeJob?.status, toast]);

  useEffect(() => {
    const fetchLists = async () => {
        if (activeAccount && activeAccount.apiKey && activeAccount.apiUrl) {
            try {
                const response = await fetch('/api/activecampaign/lists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: activeAccount.apiKey, apiUrl: activeAccount.apiUrl })
                });
                if (!response.ok) throw new Error("Failed to fetch");
                const data = await response.json();
                setLists(data);
            } catch (error) {
                toast({ title: "Error", description: "Could not fetch lists.", variant: "destructive" });
                setLists([]);
            }
        } else {
            setLists([]);
        }
    };
    fetchLists();
  }, [activeAccount, toast]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) {
      toast({ title: "No Active Account", description: "Please select an account first.", variant: "destructive" });
      return;
    }
     if (!selectedList) {
      toast({ title: "No List Selected", description: "Please select a list to add the user to.", variant: "destructive" });
      return;
    }

    const importDataString = `${formData.email},${formData.firstName},${formData.lastName}`;
    const selectedListName = lists.find(l => l.listId === selectedList)?.name || 'Unknown List';

    startJob(activeAccount.id, selectedList, selectedListName, importDataString, 0);

    toast({ title: "Import Started", description: `Importing ${formData.email}...`});
    
    // Clear data but keep list
    setFormData({ firstName: "", lastName: "", email: ""}); 
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isImporting = activeJob && (activeJob.status === 'running' || activeJob.status === 'paused');
  const successCount = activeJob?.results.filter(r => r.status === 'success').length || 0;
  const failedCount = activeJob?.results.filter(r => r.status === 'failed').length || 0;
  const remainingCount = activeJob ? activeJob.totalContacts - (successCount + failedCount) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Single User Import</h1>
          <p className="text-muted-foreground">Add a new contact to a list to trigger an automation.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
            <CardDescription>
                Fill in the details for the new contact you want to add.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="list">List</Label>
                <Select value={selectedList || ""} onValueChange={setSelectedList} disabled={!activeAccount || !!isImporting}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a list" />
                    </SelectTrigger>
                    <SelectContent>
                        {lists.map(list => (
                            <SelectItem key={list.listId} value={list.listId}>{list.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="John"
                    disabled={!!isImporting}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Doe"
                    disabled={!!isImporting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="user@example.com"
                  required
                  disabled={!!isImporting}
                />
              </div>

              <div className="flex gap-2">
                {!isImporting && (
                  <Button type="submit" className="flex-1" disabled={!activeAccount || !selectedList}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Import
                  </Button>
                )}
                {isImporting && activeJob?.status === 'running' && (
                    <Button variant="outline" type="button" onClick={() => pauseJob(activeJob.id)} className="flex-1">
                        <Pause className="w-4 h-4 mr-2"/> Pause
                    </Button>
                )}
                {isImporting && activeJob?.status === 'paused' && (
                    <Button variant="outline" type="button" onClick={() => resumeJob(activeJob.id)} className="flex-1">
                        <PlayIcon className="w-4 h-4 mr-2"/> Resume
                    </Button>
                )}
                {isImporting && (
                    <Button variant="destructive" type="button" onClick={() => cancelJob(activeJob.id)} className="flex-1">
                        <XCircle className="w-4 h-4 mr-2"/> End Job
                    </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {activeJob && (
            <Card>
                <CardHeader>
                    <CardTitle>Import Results</CardTitle>
                    <CardDescription>Status: <span className="font-bold uppercase">{activeJob.status}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center p-4 border rounded-lg bg-muted/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Success</p>
                                <p className="text-lg font-bold text-green-600">{successCount}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Fail</p>
                                <p className="text-lg font-bold text-red-600">{failedCount}</p>
                            </div>
                        </div>
                        <div>
                            <Progress value={activeJob.progress} className="h-2" />
                        </div>
                        
                        <div className="rounded-md border max-h-[200px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeJob.results.map((result) => (
                                        <TableRow key={result.index}>
                                            <TableCell>{result.email}</TableCell>
                                            <TableCell>
                                                <Badge className={cn(result.status === 'success' ? 'bg-green-600' : 'bg-destructive', 'text-white')}>
                                                    {result.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><FileJson2 className="h-4 w-4" /></Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Raw Data</DialogTitle></DialogHeader>
                                                        <pre className="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-x-auto text-white">
                                                            {JSON.stringify(JSON.parse(result.data), null, 2)}
                                                        </pre>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}