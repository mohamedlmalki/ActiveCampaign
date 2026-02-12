import { useState, useEffect, useMemo } from "react";
import { Upload, Play, Pause, Play as PlayIcon, StopCircle, CheckCircle, XCircle, FileJson } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAccount } from "@/contexts/AccountContext";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useJob } from "@/contexts/JobContext";

interface List {
    listId: string;
    name: string;
}

// Helper to format time
function formatElapsedTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function BulkImport() {
  const { activeAccount } = useAccount();
  const { toast } = useToast();
  const { jobs, addJob, pauseJob, resumeJob, stopJob } = useJob(); 
  
  const [specificJobId, setSpecificJobId] = useState<string | null>(null);

  // --- SMART JOB SELECTION ---
  const activeJob = useMemo(() => {
     if (!activeAccount) return null;
     if (specificJobId) {
         const found = jobs.find(j => j.id === specificJobId);
         if (found) return found;
     }
     const accountJobs = jobs.filter(j => j.title.includes(activeAccount.id));
     if (accountJobs.length === 0) return null;
     const active = accountJobs.find(j => ['processing', 'pending', 'paused'].includes(j.status));
     if (active) return active;
     return accountJobs[accountJobs.length - 1];
  }, [jobs, activeAccount, specificJobId]);

  const [lists, setLists] = useState<List[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [importData, setImportData] = useState("");
  const [defaultFirstName, setDefaultFirstName] = useState("");
  const [delay, setDelay] = useState(1);

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);

  const isJobActive = activeJob && ['processing', 'paused'].includes(activeJob.status);

  // --- TIMER LOGIC ---
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = useMemo(() => {
      if (!activeJob) return 0;
      
      const isDone = ['completed', 'failed', 'stopped'].includes(activeJob.status);
      const endTime = (isDone && activeJob.endTime) ? activeJob.endTime : now;
      
      let duration = endTime - activeJob.startTime;
      duration -= (activeJob.totalPausedTime || 0);

      if (activeJob.status === 'paused' && activeJob.pauseStartTime) {
          duration -= (now - activeJob.pauseStartTime);
      }

      return Math.max(0, Math.floor(duration / 1000));
  }, [activeJob, now]);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (activeAccount) {
        const key = `bm_draft_${activeAccount.id}`;
        const saved = sessionStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setImportData(parsed.importData || "");
                setSelectedList(parsed.selectedList || null);
                setDefaultFirstName(parsed.defaultFirstName || "");
            } catch (e) { console.error(e); }
        } else {
            setImportData("");
            setSelectedList(null);
            setDefaultFirstName("");
        }
    }
  }, [activeAccount?.id]);

  const saveDraft = (updates: any) => {
      if (!activeAccount) return;
      const currentState = { importData, selectedList, defaultFirstName, ...updates };
      sessionStorage.setItem(`bm_draft_${activeAccount.id}`, JSON.stringify(currentState));
  };

  const handleImportDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setImportData(val);
      saveDraft({ importData: val });
  };

  const handleListChange = (val: string) => {
      setSelectedList(val);
      saveDraft({ selectedList: val });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setDefaultFirstName(val);
      saveDraft({ defaultFirstName: val });
  };

  const emailCount = useMemo(() => {
    return importData.split('\n').filter(line => line.trim() !== '').length;
  }, [importData]);

  useEffect(() => {
    const fetchLists = async () => {
        if (activeAccount && activeAccount.apiKey && activeAccount.provider === 'benchmark') {
            try {
                const response = await fetch('/api/benchmark/lists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: activeAccount.apiKey })
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                  setLists(data);
                } else {
                  setLists([]);
                }
            } catch (error) {
                console.error(error);
            }
        }
    };
    fetchLists();
  }, [activeAccount, toast]);

  const handleStartImport = () => {
    if (!activeAccount || !selectedList) return;
    const selectedListName = lists.find(a => a.listId === selectedList)?.name || 'Unknown List';
    
    const contacts = importData.split('\n').filter(l => l.trim()).map(line => {
        const [email, fname, lname] = line.split(',');
        return {
            email: email?.trim(),
            firstName: fname?.trim() || defaultFirstName,
            lastName: lname?.trim(),
            listId: selectedList
        };
    });

    const currentApiKey = activeAccount.apiKey;
    const currentListId = selectedList;

    const newJobId = addJob({
        title: `Benchmark Import ${selectedListName} (${activeAccount.id})`,
        totalItems: contacts.length,
        data: contacts,
        batchSize: 1,
        apiEndpoint: '/api/benchmark/import/contact',
        processItem: async (contact) => {
            if (delay > 0) await new Promise(r => setTimeout(r, delay * 1000));
            const res = await fetch('/api/benchmark/import/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    apiKey: currentApiKey, 
                    listId: currentListId,
                    contact 
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error("API Error");
            return { ...json, email: contact.email };
        }
    });
    
    setSpecificJobId(newJobId);
    toast({ title: "Job Started", description: "Bulk import is running in background." });
  };
  
  const successCount = activeJob?.results.filter(r => r.status === 'success').length || 0;
  const failedCount = activeJob?.results.filter(r => r.status === 'error').length || 0;
  const remainingCount = activeJob ? activeJob.totalItems - (successCount + failedCount) : 0;
  const progress = activeJob && activeJob.totalItems > 0 
    ? ((successCount + failedCount) / activeJob.totalItems) * 100 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Bulk User Import (Benchmark)</h1>
          <p className="text-muted-foreground">Import users into a Benchmark Email list.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-4">
                <div>
                    <Label htmlFor="list">Select List</Label>
                    <Select value={selectedList || ""} onValueChange={handleListChange} disabled={!activeAccount || !!isJobActive}>
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
                        <Label htmlFor="fname">Default First Name</Label>
                        <Input 
                            id="fname" 
                            value={defaultFirstName} 
                            onChange={handleNameChange} 
                            placeholder="e.g. Subscriber" 
                            disabled={!!isJobActive} 
                        />
                    </div>
                    <div>
                        <Label htmlFor="delay">Delay (seconds)</Label>
                        <Input id="delay" type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value))} min="0" disabled={!!isJobActive} />
                    </div>
                </div>
            </div>
            
            {activeJob && (
                <div className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 border rounded-lg bg-muted/50">
                        {/* REPLACED STATUS WITH TIMER */}
                        <div>
                            <p className="text-xs text-muted-foreground">Time Elapsed</p>
                            <p className="text-lg font-bold font-mono">{formatElapsedTime(elapsedSeconds)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Success</p>
                            <p className="text-lg font-bold text-green-600">{successCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Fail</p>
                            <p className="text-lg font-bold text-red-600">{failedCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Remain</p>
                            <p className="text-lg font-bold">{remainingCount}</p>
                        </div>
                    </div>
                    <div>
                         <Progress value={progress} className="h-2" />
                         <p className="text-sm text-muted-foreground mt-2 text-center">
                           {progress.toFixed(0)}% Completed {activeJob.status === 'paused' && <span className="text-yellow-600">(Paused)</span>}
                        </p>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              User Data Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="emails">Paste data manually (email,firstname,lastname):</Label>
                  <span className="text-xs font-medium text-muted-foreground">Detected: {emailCount}</span>
              </div>
              <Textarea
                id="emails"
                placeholder="test@example.com,John,Doe"
                value={importData}
                onChange={handleImportDataChange}
                className="min-h-[200px] font-mono text-sm"
                readOnly={!!isJobActive}
              />
            </div>

            <div className="flex gap-2">
              {!isJobActive ? (
                <Button 
                    onClick={handleStartImport} 
                    className="flex-1"
                    disabled={!activeAccount || !selectedList || emailCount === 0}
                >
                    <Play className="w-4 h-4 mr-2" />
                    Start Import
                </Button>
              ) : (
                <div className="flex gap-2 w-full">
                  <Button variant="outline" onClick={() => activeJob?.status === 'paused' ? resumeJob(activeJob.id) : pauseJob(activeJob!.id)} className="flex-1">
                      {activeJob?.status === 'paused' ? <PlayIcon className="w-4 h-4 mr-2"/> : <Pause className="w-4 h-4 mr-2"/>}
                      {activeJob?.status === 'paused' ? "Resume" : "Pause"}
                  </Button>
                  <Button variant="destructive" onClick={() => stopJob(activeJob!.id)} className="flex-1">
                      <StopCircle className="w-4 h-4 mr-2"/> End Job
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

       {activeJob && activeJob.results.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeJob.results.slice().reverse().map((result, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{activeJob.results.length - idx}</TableCell>
                             <TableCell>{result.data?.email || result.data?.contact?.email || 'Unknown'}</TableCell>
                            <TableCell>
                               <Badge className={cn(result.status === 'success' ? 'bg-green-600' : 'bg-destructive', 'text-white')}>
                                {result.status}
                               </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => { setDetailsData(result); setDetailsModalOpen(true); }}
                                >
                                    <FileJson className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                   </div>
                </CardContent>
            </Card>
        )}

        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>API Response Details</DialogTitle>
                    <DialogDescription>Raw response from Benchmark.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-slate-950 text-slate-50 font-mono text-xs">
                    <pre>{JSON.stringify(detailsData, null, 2)}</pre>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
  );
}