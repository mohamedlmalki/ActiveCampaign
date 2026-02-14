import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock, Terminal, FileJson, CheckCircle, XCircle, Info, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { useJob } from '@/contexts/JobContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type FilterStatus = 'all' | 'success' | 'failed';

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function BrevoBulkImport() {
    const { activeAccount: selectedAccount } = useAccount();
    const { getActiveJobForAccount, addJob, pauseJob, resumeJob, stopJob } = useJob();

    const [emailListInput, setEmailListInput] = useState('');
    const [delayInput, setDelayInput] = useState(1);
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [lists, setLists] = useState<any[]>([]);
    const [selectedList, setSelectedList] = useState<string | null>(null);
    
    // REMOVED: Default "Friend" name state

    const [viewDetails, setViewDetails] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [now, setNow] = useState(Date.now());

    const currentJob = useMemo(() => {
        if (!selectedAccount) return null;
        return getActiveJobForAccount(selectedAccount.id);
    }, [selectedAccount, getActiveJobForAccount]);

    const isRunning = currentJob?.status === 'processing';
    const isPaused = currentJob?.status === 'paused';
    const isWorking = isRunning || isPaused;

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (selectedAccount?.provider === 'brevo') {
            fetchLists();
        }
    }, [selectedAccount]);

    const fetchLists = async () => {
        if (!selectedAccount) return;
        try {
            const res = await fetch('/api/brevo/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: selectedAccount.apiKey })
            });
            if (res.ok) {
                const data = await res.json();
                setLists(Array.isArray(data) ? data : []);
            }
        } catch (e) { console.error(e); }
    };

    const handleStartImport = () => {
        if (!selectedAccount || !selectedList || !emailListInput.trim()) return;
        
        const contacts = emailListInput.split('\n').filter(l => l.trim()).map(line => {
            const [email, name] = line.split(',');
            // FIX: Only send firstName if explicitly provided. No "Friend" default.
            return { 
                email: email.trim(), 
                firstName: name?.trim() ? name.trim() : undefined 
            };
        });

        const apiKey = selectedAccount.apiKey;
        const listId = selectedList;

        addJob({
            title: `Brevo Import (${contacts.length})`,
            totalItems: contacts.length,
            data: contacts,
            apiEndpoint: 'brevo-import',
            batchSize: 1,
            processItem: async (contact) => {
                if (delayInput > 0) await new Promise(r => setTimeout(r, delayInput * 1000));
                
                const res = await fetch('/api/brevo/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey, listId, contact })
                });
                
                const data = await res.json();
                // FIX: Pass the real error message up
                if (!res.ok) {
                    const msg = data.details?.message || data.error || "Failed";
                    throw new Error(msg);
                }
                return { ...data, email: contact.email };
            }
        }, selectedAccount.id);
        
        toast({ title: "Job Started", description: "Importing contacts to Brevo..." });
    };

    const elapsedTime = useMemo(() => {
        if (!currentJob) return 0;
        const isDone = ['completed', 'failed', 'stopped'].includes(currentJob.status);
        const endTime = isDone && currentJob.endTime ? currentJob.endTime : now;
        let d = endTime - currentJob.startTime - (currentJob.totalPausedTime || 0);
        if (currentJob.status === 'paused' && currentJob.pauseStartTime) d -= (now - currentJob.pauseStartTime);
        return Math.max(0, Math.floor(d / 1000));
    }, [currentJob, now]);

    const filteredResults = useMemo(() => {
        if (!currentJob) return [];
        if (filter === 'all') return currentJob.results;
        return currentJob.results.filter(r => r.status === filter);
    }, [currentJob, filter]);

    const progress = currentJob && currentJob.totalItems > 0 ? (currentJob.processedItems / currentJob.totalItems) * 100 : 0;
    const { successCount, errorCount } = useMemo(() => {
        if (!currentJob) return { successCount: 0, errorCount: 0 };
        return {
            successCount: currentJob.results.filter(r => r.status === 'success').length,
            errorCount: currentJob.results.filter(r => r.status !== 'success').length,
        };
    }, [currentJob]);

    return (
        <div className="p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 h-[calc(100vh-60px)] flex flex-col">
            <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="p-2 bg-primary/10 rounded-lg"><Upload className="h-6 w-6 text-primary" /></div>
                <div><h1 className="text-2xl font-bold tracking-tight">Brevo Import</h1><p className="text-sm text-muted-foreground">Bulk import contacts to lists.</p></div>
            </div>

            {!selectedAccount && <Alert variant="destructive" className="mb-6"><Terminal className="h-4 w-4" /><AlertTitle>No Account</AlertTitle><AlertDescription>Select a Brevo account.</AlertDescription></Alert>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/20"><CardTitle className="text-base font-semibold">Configuration</CardTitle></CardHeader>
                    <CardContent className="flex-1 flex flex-col p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Target List</Label>
                                <Select value={selectedList || ""} onValueChange={setSelectedList} disabled={isWorking}>
                                    <SelectTrigger><SelectValue placeholder="Select List" /></SelectTrigger>
                                    <SelectContent>{lists.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Delay (s)</Label>
                                <Input type="number" value={delayInput} onChange={e => setDelayInput(Number(e.target.value))} disabled={isWorking} />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-0">
                            <Label>Emails (email,name)</Label>
                            <Textarea value={emailListInput} onChange={e => setEmailListInput(e.target.value)} className="flex-1 font-mono text-xs resize-none" placeholder="user@example.com&#10;user2@example.com,John" disabled={isWorking} />
                        </div>
                        <Button onClick={handleStartImport} disabled={!selectedAccount || isWorking || !selectedList} className="w-full"><Play className="mr-2 h-4 w-4" /> Start Import</Button>
                        {isWorking && (
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => isPaused ? resumeJob(currentJob!.id) : pauseJob(currentJob!.id)} className="flex-1"><Clock className="mr-2 h-4 w-4" /> {isPaused ? "Resume" : "Pause"}</Button>
                                <Button variant="destructive" size="icon" onClick={() => stopJob(currentJob!.id)}><Square className="h-4 w-4" /></Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex flex-col h-full overflow-hidden border-l-4 border-l-primary/20">
                    <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row justify-between items-center space-y-0">
                        <CardTitle className="text-base font-semibold">Results</CardTitle>
                        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as FilterStatus)} size="sm">
                            <ToggleGroupItem value="all" className="h-7 text-xs">All</ToggleGroupItem>
                            <ToggleGroupItem value="success" className="h-7 text-xs text-green-600">Success</ToggleGroupItem>
                            <ToggleGroupItem value="failed" className="h-7 text-xs text-red-600">Failed</ToggleGroupItem>
                        </ToggleGroup>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                        <div className="grid grid-cols-3 divide-x border-b bg-muted/10">
                            <div className="p-3 text-center"><div className="text-[10px] uppercase text-muted-foreground font-bold">Time</div><div className="text-lg font-mono">{formatTime(elapsedTime)}</div></div>
                            <div className="p-3 text-center"><div className="text-[10px] uppercase text-muted-foreground font-bold">Success</div><div className="text-lg font-bold text-green-600">{successCount}</div></div>
                            <div className="p-3 text-center"><div className="text-[10px] uppercase text-muted-foreground font-bold">Failed</div><div className="text-lg font-bold text-red-600">{errorCount}</div></div>
                        </div>
                        <div className="px-4 py-3 border-b"><Progress value={progress} className="h-1.5" /></div>
                        <div className="flex-1 overflow-auto bg-slate-50/50">
                            <Table>
                                <TableHeader className="bg-background sticky top-0"><TableRow className="h-9"><TableHead className="w-[50px]">#</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Info</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredResults.map((r, i) => (
                                        <TableRow key={i} className="h-9">
                                            <TableCell className="text-xs text-muted-foreground">{filteredResults.length - i}</TableCell>
                                            <TableCell className="text-xs">{r.data?.email}</TableCell>
                                            <TableCell><Badge variant="outline" className={r.status === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}>{r.status === 'success' ? 'OK' : 'Fail'}</Badge></TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setViewDetails(r); setIsDetailsOpen(true); }}><Info className="h-3 w-3" /></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent><DialogHeader><DialogTitle>Log Details</DialogTitle></DialogHeader><ScrollArea className="h-[300px] w-full border p-4 bg-slate-950 text-slate-50 rounded-md"><pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(viewDetails || {}, null, 2)}</pre></ScrollArea></DialogContent>
            </Dialog>
        </div>
    );
}