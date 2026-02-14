import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Send, Pause, Play as PlayIcon, Square, Clock, Terminal, FileJson, CheckCircle, XCircle, Info, RefreshCw, Eye, ImagePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAccount } from '@/contexts/AccountContext';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useJob } from '@/contexts/JobContext';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PreviewDialog } from '@/components/PreviewDialog';
import { AddImageDialog } from '@/components/AddImageDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Types
type FilterStatus = 'all' | 'success' | 'failed';
const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function BulkTransactionalSend() {
    const { activeAccount: selectedAccount } = useAccount();
    const { getActiveJobForAccount, addJob, pauseJob, resumeJob, stopJob } = useJob();

    // Config State
    const [recipientList, setRecipientList] = useState("");
    const [subject, setSubject] = useState("");
    const [htmlContent, setHtmlContent] = useState("");
    const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
    const [senders, setSenders] = useState<any[]>([]);
    const [delayInput, setDelayInput] = useState(1);
    const [isLoadingSenders, setIsLoadingSenders] = useState(false);

    const htmlContentRef = useRef<HTMLTextAreaElement>(null);

    // View State
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [viewDetails, setViewDetails] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Job Logic
    const currentJob = useMemo(() => {
        if (!selectedAccount) return null;
        return getActiveJobForAccount(selectedAccount.id);
    }, [selectedAccount, getActiveJobForAccount]);

    const isRunning = currentJob?.status === 'processing';
    const isPaused = currentJob?.status === 'paused';
    const isWorking = isRunning || isPaused;

    // --- Init ---
    useEffect(() => {
        if (selectedAccount) {
            // Restore draft
            const draft = sessionStorage.getItem(`brevo_send_${selectedAccount.id}`);
            if (draft) {
                const p = JSON.parse(draft);
                setRecipientList(p.recipientList || "");
                setSubject(p.subject || "");
                setHtmlContent(p.htmlContent || "");
                setSelectedSenderId(p.selectedSenderId || null);
            }
            fetchSenders();
        }
    }, [selectedAccount?.id]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const saveState = (updates: any) => {
        if (!selectedAccount) return;
        const current = {
            recipientList: updates.recipientList ?? recipientList,
            subject: updates.subject ?? subject,
            htmlContent: updates.htmlContent ?? htmlContent,
            selectedSenderId: updates.selectedSenderId ?? selectedSenderId
        };
        sessionStorage.setItem(`brevo_send_${selectedAccount.id}`, JSON.stringify(current));
    };

    const fetchSenders = async () => {
        if (!selectedAccount) return;
        setIsLoadingSenders(true);
        try {
            const res = await fetch('/api/brevo/senders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: selectedAccount.apiKey })
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            const active = (Array.isArray(data) ? data : []).filter((s: any) => s.active);
            setSenders(active);
        } catch (e) { toast({ title: "Error", description: "Failed to load senders", variant: "destructive" }) }
        finally { setIsLoadingSenders(false); }
    };

    const handleStart = () => {
        if (!selectedAccount || !selectedSenderId || !subject || !htmlContent || !recipientList.trim()) return;

        const sender = senders.find(s => String(s.id) === String(selectedSenderId));
        const recipients = recipientList.split('\n').filter(l => l.trim()).map(line => {
            const [email, name] = line.split(',');
            return { email: email.trim(), name: name?.trim() };
        });

        const apiKey = selectedAccount.apiKey;

        addJob({
            title: `Send: ${subject}`,
            totalItems: recipients.length,
            data: recipients,
            apiEndpoint: 'brevo-send',
            batchSize: 1,
            processItem: async (recipient) => {
                if (delayInput > 0) await new Promise(r => setTimeout(r, delayInput * 1000));
                
                const res = await fetch('/api/brevo/smtp/send-single', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiKey,
                        senderId: selectedSenderId,
                        to: recipient,
                        subject,
                        htmlContent
                    })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(JSON.stringify(data.error || "Failed"));
                return { ...data, email: recipient.email };
            }
        }, selectedAccount.id);

        toast({ title: "Sending Started", description: `Sending to ${recipients.length} recipients.` });
    };

    const handleInsertImage = (img: string) => {
        setHtmlContent(prev => prev + img);
        saveState({ htmlContent: htmlContent + img });
    };

    // --- Stats ---
    const elapsedTime = useMemo(() => {
        if (!currentJob) return 0;
        const isDone = ['completed', 'failed', 'stopped'].includes(currentJob.status);
        const endTime = (isDone && currentJob.endTime) ? currentJob.endTime : now;
        let d = endTime - currentJob.startTime - (currentJob.totalPausedTime || 0);
        if (currentJob.status === 'paused' && currentJob.pauseStartTime) d -= (now - currentJob.pauseStartTime);
        return Math.max(0, Math.floor(d / 1000));
    }, [currentJob, now]);

    const filteredResults = useMemo(() => {
        if (!currentJob) return [];
        if (filter === 'all') return currentJob.results;
        return currentJob.results.filter(r => r.status === filter);
    }, [currentJob, filter]);

    const { successCount, errorCount } = useMemo(() => {
        if (!currentJob) return { successCount: 0, errorCount: 0 };
        return {
            successCount: currentJob.results.filter(r => r.status === 'success').length,
            errorCount: currentJob.results.filter(r => r.status === 'error' || r.status === 'failed').length,
        };
    }, [currentJob]);

    const progress = currentJob && currentJob.totalItems > 0 ? (currentJob.processedItems / currentJob.totalItems) * 100 : 0;
    const recipientCount = recipientList.split('\n').filter(x => x.trim()).length;

    return (
        <div className="p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 h-[calc(100vh-60px)] flex flex-col">
            <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="p-2 bg-primary/10 rounded-lg"><Send className="h-6 w-6 text-primary" /></div>
                <div><h1 className="text-2xl font-bold tracking-tight">Bulk Transactional Send</h1><p className="text-sm text-muted-foreground">Send transactional emails via Brevo SMTP.</p></div>
            </div>

            {!selectedAccount && <Alert variant="destructive" className="mb-6 shrink-0"><Terminal className="h-4 w-4" /><AlertTitle>No Account Selected</AlertTitle><AlertDescription>Select an account to proceed.</AlertDescription></Alert>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* LEFT: Config */}
                <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/20"><CardTitle className="text-base font-semibold flex items-center gap-2"><Terminal className="h-4 w-4" /> Email Configuration</CardTitle></CardHeader>
                    <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sender</Label>
                                <div className="flex gap-2">
                                    <Select value={selectedSenderId || ""} onValueChange={(v) => { setSelectedSenderId(v); saveState({ selectedSenderId: v }); }} disabled={isWorking || !selectedAccount}>
                                        <SelectTrigger><SelectValue placeholder="Select Sender" /></SelectTrigger>
                                        <SelectContent>{senders.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.email})</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon" onClick={() => fetchSenders()} disabled={isWorking}><RefreshCw className={isLoadingSenders ? "animate-spin" : ""} /></Button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Delay (s)</Label>
                                <Input type="number" value={delayInput} onChange={e => setDelayInput(parseFloat(e.target.value))} disabled={isWorking} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subject</Label>
                            <Input value={subject} onChange={e => { setSubject(e.target.value); saveState({ subject: e.target.value }); }} disabled={isWorking} />
                        </div>

                        <div className="space-y-1 flex-1 flex flex-col min-h-[150px]">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">HTML Content</Label>
                                <div className="flex gap-2">
                                    <AddImageDialog onInsertImage={handleInsertImage}><Button variant="outline" size="sm" className="h-6 text-xs"><ImagePlus className="w-3 h-3 mr-1" /> Image</Button></AddImageDialog>
                                    <PreviewDialog htmlContent={htmlContent}><Button variant="outline" size="sm" className="h-6 text-xs"><Eye className="w-3 h-3 mr-1" /> Preview</Button></PreviewDialog>
                                </div>
                            </div>
                            <Textarea ref={htmlContentRef} value={htmlContent} onChange={e => { setHtmlContent(e.target.value); saveState({ htmlContent: e.target.value }); }} className="flex-1 font-mono text-xs resize-none" disabled={isWorking} />
                        </div>

                        <div className="space-y-1 h-[100px]">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Recipients (email,name)</Label>
                            <Textarea value={recipientList} onChange={e => { setRecipientList(e.target.value); saveState({ recipientList: e.target.value }); }} className="h-full font-mono text-xs resize-none" placeholder="user@example.com,John" disabled={isWorking} />
                            <div className="text-xs text-muted-foreground text-right">{recipientCount} recipients</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button onClick={handleStart} disabled={!selectedAccount || isWorking || !selectedSenderId || !subject} className="w-full"><Send className="h-4 w-4 mr-2" /> Send Emails</Button>
                            {isWorking ? (
                                <div className="flex gap-2">
                                    <Button onClick={() => isPaused ? resumeJob(currentJob!.id) : pauseJob(currentJob!.id)} variant="secondary" className="flex-1"><Clock className="h-4 w-4 mr-2" /> {isPaused ? 'Resume' : 'Pause'}</Button>
                                    <Button onClick={() => stopJob(currentJob!.id)} variant="destructive" size="icon"><Square className="h-4 w-4" /></Button>
                                </div>
                            ) : <Button variant="secondary" disabled className="w-full opacity-50"><Clock className="h-4 w-4 mr-2" /> Stop</Button>}
                        </div>
                    </CardContent>
                </Card>

                {/* RIGHT: Results */}
                <Card className="flex flex-col h-full overflow-hidden border-l-4 border-l-primary/20">
                    <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base font-semibold flex items-center gap-2"><FileJson className="h-4 w-4" /> Results</CardTitle>
                        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as FilterStatus)} size="sm" className="bg-background border rounded-md">
                            <ToggleGroupItem value="all" className="h-7 text-xs px-2">All</ToggleGroupItem>
                            <ToggleGroupItem value="success" className="h-7 text-xs px-2 text-green-600">Success</ToggleGroupItem>
                            <ToggleGroupItem value="failed" className="h-7 text-xs px-2 text-red-600">Failed</ToggleGroupItem>
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
                                <TableHeader className="bg-background sticky top-0 z-10"><TableRow className="h-9"><TableHead className="w-[50px] text-xs">#</TableHead><TableHead className="text-xs">Email</TableHead><TableHead className="w-[100px] text-xs">Status</TableHead><TableHead className="w-[60px] text-xs text-right">Info</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredResults.length > 0 ? filteredResults.slice().reverse().map((r, i) => (
                                        <TableRow key={i} className="h-9">
                                            <TableCell className="text-xs text-muted-foreground">{filteredResults.length - i}</TableCell>
                                            <TableCell className="text-xs font-medium">{r.data?.email}</TableCell>
                                            <TableCell><Badge variant="outline" className={r.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>{r.status === 'success' ? <CheckCircle className="h-2.5 w-2.5 mr-1" /> : <XCircle className="h-2.5 w-2.5 mr-1" />}{r.status === 'success' ? 'OK' : 'Fail'}</Badge></TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setViewDetails(r); setIsDetailsOpen(true); }}><Info className="h-3.5 w-3.5" /></Button></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">No logs.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Response Details</DialogTitle></DialogHeader>
                    <ScrollArea className="h-[300px] w-full border p-4 bg-slate-950 text-slate-50 rounded-md">
                        <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(viewDetails?.data || {}, null, 2)}</pre>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
};