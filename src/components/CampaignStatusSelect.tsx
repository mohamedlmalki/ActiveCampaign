import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, AlertCircle, Loader2, StopCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useJob } from "@/contexts/JobContext";
import { useAccount } from "@/contexts/AccountContext";

export function CampaignStatusSelect() {
    const { jobs } = useJob();
    const { accounts, activeAccount, setActiveAccount } = useAccount();
    const [open, setOpen] = useState(false);

    // --- 1. GROUP JOBS BY ACCOUNT (GLOBAL) ---
    // This finds the *latest* job for EVERY account that has history
    const latestAccountJobs = useMemo(() => {
        const map = new Map();
        // Sort jobs by start time (newest first)
        const sortedJobs = [...jobs].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

        sortedJobs.forEach(job => {
            // Find the account this job belongs to
            // Check both specific accountId (new) and title text (legacy fallback)
            const account = accounts.find(a => 
                (job.accountId === a.id) || 
                (job.title && job.title.includes(a.id))
            );

            if (account) {
                // Only keep the most recent job for each account
                if (!map.has(account.id)) {
                    map.set(account.id, { job, account });
                }
            }
        });
        
        return Array.from(map.values());
    }, [jobs, accounts]);

    // --- 2. DETERMINE WHICH JOB TO SHOW ON THE BUTTON ---
    const displayItem = useMemo(() => {
        if (latestAccountJobs.length === 0) return null;

        // Priority 1: Job for the CURRENT active account (Context sensitive)
        const currentAccountJob = latestAccountJobs.find(item => item.account.id === activeAccount?.id);
        if (currentAccountJob) return currentAccountJob;

        // Priority 2: Any job that is actively RUNNING (Global notification)
        const runningJob = latestAccountJobs.find(item => item.job.status === 'processing');
        if (runningJob) return runningJob;

        // Priority 3: The most recent job available
        return latestAccountJobs[0];
    }, [latestAccountJobs, activeAccount]);

    const selectedJob = displayItem?.job;
    const selectedAccount = displayItem?.account;

    // Helper: Status Colors
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return "text-green-600";
            case 'processing': return "text-blue-600";
            case 'paused': return "text-yellow-600";
            case 'stopped': return "text-orange-600";
            case 'failed': return "text-red-500";
            default: return "text-muted-foreground";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'processing': return <Loader2 className="w-3 h-3 animate-spin" />;
            case 'completed': return <CheckCircle2 className="w-3 h-3" />;
            case 'stopped': return <StopCircle className="w-3 h-3" />;
            case 'failed': return <AlertCircle className="w-3 h-3" />;
            default: return null;
        }
    };

    // --- EMPTY STATE ---
    if (!selectedJob || !selectedAccount) {
        return (
            <Button variant="outline" className="w-[340px] justify-between text-muted-foreground opacity-50 cursor-not-allowed h-auto py-2 px-3 bg-background">
                <div className="flex flex-col items-start text-left w-full gap-1">
                    <span className="font-semibold text-sm">No recent activity</span>
                    <span className="text-xs">Start an import to see progress</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        );
    }

    const progress = selectedJob.totalItems > 0 
        ? (selectedJob.processedItems / selectedJob.totalItems) * 100 
        : 0;

    // Helper for Provider Label (e.g. ActiveCampaign -> AC)
    const getProviderLabel = (p: string) => {
        if (p === 'activecampaign') return 'ActiveCampaign';
        if (p === 'buttondown') return 'Buttondown';
        if (p === 'benchmark') return 'BenchMark';
        if (p === 'omnisend') return 'Omnisend';
        return p.substring(0, 2).toUpperCase();
    };

    const getProviderColor = (p: string) => {
        if (p === 'activecampaign') return "border-blue-200 text-blue-600 bg-blue-50";
        if (p === 'buttondown') return "border-indigo-200 text-indigo-600 bg-indigo-50";
        return "border-orange-200 text-orange-600 bg-orange-50";
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-[340px] justify-between h-auto py-2 px-3 bg-background">
                    <div className="flex flex-col items-start text-left w-full gap-1">
                        {/* Top Line: Account Name (Dynamic) */}
                        <div className="flex justify-between w-full items-center">
                            <span className="font-semibold text-sm truncate max-w-[200px]">
                                {selectedAccount.name} <span className="text-muted-foreground font-normal text-xs capitalize">- {selectedAccount.provider}</span>
                            </span>
                            {/* Status Badge */}
                            <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 capitalize gap-1", getStatusColor(selectedJob.status))}>
                                {getStatusIcon(selectedJob.status)}
                                {selectedJob.status}
                            </Badge>
                        </div>
                        
                        {/* Bottom Line: Counters */}
                        <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                            <span className="font-mono">
                                {selectedJob.processedItems}/{selectedJob.totalItems}
                            </span>
                            <span>{progress.toFixed(0)}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-secondary mt-1 rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full transition-all duration-300", 
                                    selectedJob.status === 'completed' ? "bg-green-500" : 
                                    selectedJob.status === 'failed' ? "bg-red-500" : 
                                    selectedJob.status === 'stopped' ? "bg-orange-400" : "bg-blue-500"
                                )}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[340px] p-0" align="end">
                <Command>
                    <CommandInput placeholder="Search active jobs..." />
                    <CommandList>
                        <CommandEmpty>No recent jobs found.</CommandEmpty>
                        <CommandGroup heading="Recent Jobs (All Accounts)">
                            {latestAccountJobs.map(({ job, account }) => {
                                // Check if this is the currently "Viewed" account in the main app
                                const isCurrentContext = account.id === activeAccount?.id;
                                const jobProgress = job.totalItems > 0 ? (job.processedItems / job.totalItems) * 100 : 0;

                                return (
                                    <CommandItem
                                        key={account.id}
                                        value={account.name + account.provider} 
                                        onSelect={() => {
                                            setActiveAccount(account);
                                            setOpen(false);
                                        }}
                                        className="flex flex-col items-start py-3 border-b last:border-0 cursor-pointer data-[selected=true]:bg-accent"
                                    >
                                        <div className="flex justify-between w-full items-center mb-1">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="font-medium text-sm truncate max-w-[150px]">
                                                    {account.name}
                                                </span>
                                                <Badge variant="outline" className={cn("text-[10px] h-4 px-1", getProviderColor(account.provider))}>
                                                    {getProviderLabel(account.provider)}
                                                </Badge>
                                            </div>
                                            {isCurrentContext && <Check className="h-4 w-4 text-primary ml-auto" />}
                                        </div>

                                        <div className="flex justify-between items-center w-full text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("capitalize flex items-center gap-1", getStatusColor(job.status))}>
                                                    {getStatusIcon(job.status)}
                                                    {job.status}
                                                </span>
                                            </div>
                                            <span className="font-mono text-muted-foreground">
                                                {job.processedItems}/{job.totalItems}
                                            </span>
                                        </div>
                                        
                                        <div className="w-full h-0.5 bg-muted mt-2 rounded-full overflow-hidden">
                                            <div 
                                                className={cn("h-full", 
                                                    job.status === 'completed' ? "bg-green-500" : 
                                                    job.status === 'failed' ? "bg-red-500" : 
                                                    job.status === 'stopped' ? "bg-orange-400" : "bg-blue-500"
                                                )}
                                                style={{ width: `${jobProgress}%` }}
                                            />
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}