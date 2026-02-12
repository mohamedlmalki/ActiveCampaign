import { useState, useEffect, useMemo } from 'react';
import { useAccount } from "@/contexts/AccountContext";
import { useJob } from "@/contexts/JobContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Upload, Play, RefreshCw, Save, Pause, XCircle, FileJson, Download, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Helper to format time (seconds to HH:MM:SS)
function formatElapsedTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function ButtondownBulkImport() {
  const { activeAccount } = useAccount();
  const { jobs, addJob, pauseJob, resumeJob, removeJob } = useJob();
  
  // Track the ID of the specific job we just started
  const [specificJobId, setSpecificJobId] = useState<string | null>(null);

  // --- SMART JOB SELECTION ---
  const currentJob = useMemo(() => {
     if (!activeAccount) return null;

     // 1. If we have a specific ID we are tracking, prioritize it
     if (specificJobId) {
         const found = jobs.find(j => j.id === specificJobId);
         if (found) return found;
     }

     // 2. Find all jobs for this account
     const accountJobs = jobs.filter(j => j.title.includes(activeAccount.id));
     if (accountJobs.length === 0) return null;

     // 3. Find active (running/pending/paused)
     const active = accountJobs.find(j => ['processing', 'pending', 'paused'].includes(j.status));
     if (active) return active;

     // 4. Default to the most recently created one
     return accountJobs[accountJobs.length - 1];
  }, [jobs, activeAccount, specificJobId]);


  // --- TIMER LOGIC ---
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = useMemo(() => {
      if (!currentJob) return 0;
      const isDone = currentJob.status === 'completed' || currentJob.status === 'failed';
      const end = (isDone && currentJob.endTime) ? currentJob.endTime : now;
      return Math.floor((end - currentJob.startTime) / 1000);
  }, [currentJob, now]);


  // --- STATE ---
  const [senderName, setSenderName] = useState("");
  const [newsletterId, setNewsletterId] = useState<string | null>(null);
  const [loadingSender, setLoadingSender] = useState(false);

  const [textInput, setTextInput] = useState("");
  const [tags, setTags] = useState("");
  const [delay, setDelay] = useState(2);
  const [selectedEmailId, setSelectedEmailId] = useState<string>("none");
  const [availableEmails, setAvailableEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);

  // --- 0. RESET FORM ON ACCOUNT SWITCH ---
  useEffect(() => {
      if (activeAccount) {
          setTextInput("");
          setTags("");
          setSenderName("");
          setNewsletterId(null);
          setSpecificJobId(null); 
          fetchNewsletterInfo();
          fetchEmails();
      }
  }, [activeAccount?.id]); 

  // --- 1. FETCH DATA ---
  const fetchNewsletterInfo = async () => {
    if (!activeAccount) return;
    setLoadingSender(true);
    try {
      const res = await fetch('/api/buttondown/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: activeAccount.apiKey })
      });
      const data = await res.json();
      if (data && data.id) {
        setNewsletterId(data.id);
        setSenderName(data.from_name || data.name || "");
      }
    } catch (err) { console.error(err); } 
    finally { setLoadingSender(false); }
  };

  const fetchEmails = async () => {
    if (!activeAccount) return;
    setLoadingEmails(true);
    try {
        const res = await fetch('/api/buttondown/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: activeAccount.apiKey })
        });
        const data = await res.json();
        if (Array.isArray(data)) setAvailableEmails(data);
    } catch (err) { console.error(err); } 
    finally { setLoadingEmails(false); }
  };

  const updateSenderName = async () => {
    if (!activeAccount || !newsletterId) return;
    setLoadingSender(true);
    try {
      const res = await fetch(`/api/buttondown/newsletter/${newsletterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: activeAccount.apiKey, from_name: senderName })
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Success", description: "Sender Name Updated" });
    } catch (err) {
      toast({ title: "Error", description: "Could not update sender name", variant: "destructive" });
    } finally {
      setLoadingSender(false);
    }
  };

  // --- 2. IMPORT LOGIC ---
  const handleImport = () => {
    if (!textInput.trim()) return;

    const lines = textInput.split(/[\n,]+/).filter(l => l.trim().length > 0);
    const contacts = lines.map(line => {
        const parts = line.split(',');
        return {
            email: parts[0].trim(),
            notes: parts[1] ? `Name: ${parts[1].trim()}` : undefined, 
            tags: tags.split(',').map(t => t.trim()).filter(Boolean)
        };
    });

    if (contacts.length === 0) return;

    const currentApiKey = activeAccount?.apiKey;
    const currentEmailId = selectedEmailId;

    const newJobId = addJob({
      title: `Buttondown Import (${activeAccount?.id})`,
      totalItems: contacts.length,
      data: contacts,
      batchSize: 1, 
      apiEndpoint: '/api/buttondown/import/contact',
      processItem: async (contact) => {
        if (delay > 0) await new Promise(r => setTimeout(r, delay * 1000));

        const res = await fetch('/api/buttondown/import/contact', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
               apiKey: currentApiKey, 
               contact,
               emailId: currentEmailId !== "none" ? currentEmailId : undefined
           })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.details || json.error || "Failed");
        
        return { ...json, email: contact.email };
      }
    });

    setSpecificJobId(newJobId);
    toast({ title: "Job Started", description: `${contacts.length} contacts queued.` });
  };

  // --- 3. UI HELPERS ---
  const emailCount = textInput.split(/[\n,]+/).filter(e => e.trim().length > 0).length;
  
  // FIX: This flag now includes 'paused' so the UI doesn't switch back to "Start" when paused
  const isJobActive = currentJob && ['processing', 'paused'].includes(currentJob.status);
  
  const successCount = currentJob?.results.filter(r => r.status === 'success').length || 0;
  const failCount = currentJob?.results.filter(r => r.status === 'error').length || 0;
  
  const progress = currentJob && currentJob.totalItems > 0 
      ? ((successCount + failCount) / currentJob.totalItems) * 100 
      : 0;
  
  const filteredResults = currentJob?.results.filter(r => {
      if (filter === 'all') return true;
      if (filter === 'success') return r.status === 'success';
      if (filter === 'failed') return r.status === 'error';
      return true;
  }) || [];

  const handleExport = () => {
    if (!filteredResults.length) return;
    const txt = filteredResults.map(r => `${r.data?.email || r.data?.data?.email || 'unknown'},${r.status}`).join('\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buttondown_export_${filter}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* LEFT COLUMN: Configuration */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Add Subscribers</CardTitle>
            <CardDescription>Add new subscribers to your mailing list.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Emails Input */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold">Email Address(es)</Label>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{emailCount} email(s)</span>
                        <Button variant="ghost" size="sm" onClick={() => setTextInput("")} disabled={isJobActive} className="h-auto py-1 px-2 text-xs">Clear</Button>
                    </div>
                </div>
                <Textarea 
                    placeholder="user@example.com&#10;user2@example.com, John Doe" 
                    rows={8} 
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    className="font-mono"
                    disabled={isJobActive}
                />
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
                <Label className="text-sm font-semibold">Tags (comma separated)</Label>
                <Input placeholder="newsletter, 2024-leads" value={tags} onChange={e => setTags(e.target.value)} disabled={isJobActive}/>
            </div>

            {/* GRID: From Name & Send Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sender" className="text-sm font-semibold">From Name</Label>
                    <div className="flex gap-2">
                        <Input 
                            id="sender" 
                            value={senderName} 
                            onChange={(e) => setSenderName(e.target.value)} 
                            placeholder="e.g. John Doe"
                            disabled={loadingSender || isJobActive}
                        />
                        <Button size="icon" onClick={updateSenderName} disabled={loadingSender || isJobActive} variant="secondary">
                            {loadingSender ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center h-5 mb-1">
                        <Label className="text-sm font-semibold">Send Email (Optional)</Label>
                        <Button variant="ghost" size="sm" onClick={fetchEmails} disabled={isJobActive || loadingEmails} className="h-6 w-6 p-0">
                             <RefreshCw className={loadingEmails ? "animate-spin w-3 h-3" : "w-3 h-3"} />
                        </Button>
                    </div>
                    <Select value={selectedEmailId} onValueChange={setSelectedEmailId} disabled={isJobActive || loadingEmails}>
                        <SelectTrigger>
                            <SelectValue placeholder="Do not send" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Do not send a specific email</SelectItem>
                            {availableEmails.map((email: any) => (
                                <SelectItem key={email.id} value={email.id}>
                                    {email.subject || '(No Subject)'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-semibold">Delay Between Requests (seconds)</Label>
                <Input type="number" value={delay} onChange={e => setDelay(Number(e.target.value))} min={0} disabled={isJobActive} />
            </div>

            <div className="pt-2">
                {!isJobActive ? (
                  <Button onClick={handleImport} className="w-full h-12 text-lg" disabled={!activeAccount || emailCount === 0}>
                    <Play className="w-5 h-5 mr-2" /> Start Subscription
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                        onClick={() => currentJob?.status === 'paused' ? resumeJob(currentJob.id) : pauseJob(currentJob!.id)} 
                        className="flex-1 h-12 bg-yellow-600 hover:bg-yellow-700"
                    >
                         {currentJob?.status === 'paused' ? <Play className="w-5 h-5 mr-2"/> : <Pause className="w-5 h-5 mr-2" />}
                         {currentJob?.status === 'paused' ? "Resume" : "Pause"}
                    </Button>
                    <Button onClick={() => removeJob(currentJob!.id)} className="flex-1 h-12 bg-destructive hover:bg-destructive/90">
                        <XCircle className="w-5 h-5 mr-2" /> End Job
                    </Button>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Status & Results */}
      <div className="space-y-6">
        {(currentJob || textInput) && (
            <div className="space-y-6">
                
                {/* Status Card */}
                {currentJob && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Job Status {currentJob.status === 'completed' && <span className="text-green-600 text-sm ml-2">(Finished)</span>}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Time Elapsed</p>
                                <p className="text-2xl font-bold font-mono">{formatElapsedTime(elapsedSeconds)}</p> 
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Success</p>
                                <p className="text-2xl font-bold text-green-600">{successCount}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Fail</p>
                                <p className="text-2xl font-bold text-red-600">{failCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Progress Bar */}
                {currentJob && isJobActive && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Progress: {progress.toFixed(0)}%</span>
                            <span>{successCount + failCount} / {currentJob.totalItems}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}

                {/* Results Table */}
                {currentJob && currentJob.results.length > 0 && (
                    <Card className="flex flex-col overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <CardTitle className="text-xl">Results</CardTitle>
                             <div className="flex gap-2">
                                <ToggleGroup type="single" value={filter} onValueChange={(v: any) => v && setFilter(v)} size="sm">
                                    <ToggleGroupItem value="all" className="text-xs">All</ToggleGroupItem>
                                    <ToggleGroupItem value="success" className="text-xs text-green-600">Success</ToggleGroupItem>
                                    <ToggleGroupItem value="failed" className="text-xs text-red-600">Fail</ToggleGroupItem>
                                </ToggleGroup>
                                <Button variant="outline" size="sm" onClick={handleExport}>
                                    <Download className="w-3 h-3" />
                                </Button>
                             </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">#</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredResults.slice().reverse().map((res, i) => (
                                            <TableRow key={i} className={res.status === 'success' ? 'bg-green-50/30' : 'bg-red-50/30'}>
                                                <TableCell className="font-mono text-xs">{currentJob.results.indexOf(res) + 1}</TableCell>
                                                <TableCell className="font-medium text-sm">
                                                    {res.data?.email || res.data?.contact?.email || res.error?.data?.email || 'Unknown'}
                                                </TableCell>
                                                <TableCell>
                                                    {res.status === 'success' ? 
                                                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Success</Badge> : 
                                                        <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1"/> Failed</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => { setDetailsData(res); setDetailsModalOpen(true); }}>
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
            </div>
        )}
      </div>

      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>API Response Details</DialogTitle>
                <DialogDescription>Raw response from Buttondown.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-slate-950 text-slate-50 font-mono text-xs">
                <pre>{JSON.stringify(detailsData, null, 2)}</pre>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}