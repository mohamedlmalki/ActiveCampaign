import { useState } from "react";
import { Check, ChevronsUpDown, AlertCircle, PlayCircle, PauseCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useJob } from "@/contexts/JobContext"; // <--- CHANGED FROM useJobs TO useJob
import { useAccount } from "@/contexts/AccountContext";

export function CampaignStatusSelect() {
    const { jobs } = useJob(); // <--- CHANGED FROM useJobs TO useJob
    const { accounts, activeAccount, setActiveAccount } = useAccount();
    const [open, setOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string>("");

    // Convert jobs array (it is already an array in the new context)
    // The previous context might have had it as an object, but the new one is an array.
    // So we just reverse it directly.
    const jobList = [...jobs].reverse();

    // Determine the "Active" job to show on the closed button
    const activeRunningJob = jobList.find(j => j.status === 'processing'); // Note: Context uses 'processing', not 'running'
    const selectedJob = jobList.find((j) => j.id === selectedJobId) || activeRunningJob || jobList[0];

    // Helper: Find Full Account Object
    // Note: The new Job interface doesn't strictly have accountId or listName based on the context I gave you.
    // You might need to update the addJob call in BulkImport to include these in 'data' or extends the Job interface.
    // For now, let's assume the job object has these extended properties or we handle missing data gracefully.
    
    // safe access since custom properties might be in job.data or just untyped on the job object
    const getAccount = (job: any) => {
        // Fallback: try to find account by ID if stored, or just return undefined
        return accounts.find(a => a.id === job.accountId);
    };

    // Helper: Calculate Stats
    const getJobStats = (job: any) => {
        const processed = job.processedItems || 0;
        const failures = job.failedItems || 0;
        return { processed, failures };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return "text-green-600";
            case 'processing': return "text-blue-600"; // Context uses 'processing'
            case 'paused': return "text-yellow-600";
            case 'failed': return "text-red-500";
            default: return "text-muted-foreground";
        }
    };

    // If no jobs exist, show empty state
    if (!selectedJob) {
        return (
            <Button variant="outline" className="w-[300px] justify-between text-muted-foreground opacity-50 cursor-not-allowed">
                <span className="text-xs">No active tasks</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        );
    }

    const currentStats = getJobStats(selectedJob);
    // We cast to 'any' here because your previous JobContext might have had specific fields 
    // (accountId, listName) that the generic one I gave you doesn't enforce, 
    // but JS runtime will still have them if you passed them.
    const jobAny = selectedJob as any; 
    
    const currentAccount = getAccount(jobAny);
    const currentAccountName = currentAccount ? currentAccount.name : (jobAny.title || "Unknown");
    const currentProvider = currentAccount ? currentAccount.provider : "";
    const listName = jobAny.listName || "Bulk Import";
    const totalItems = selectedJob.totalItems || 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-[340px] justify-between h-auto py-2 px-3">
                    <div className="flex flex-col items-start text-left w-full gap-1">
                        {/* Top Line: Account Name & Provider */}
                        <div className="flex justify-between w-full items-center">
                            <div className="flex items-center gap-2 truncate">
                                <span className="font-semibold text-sm truncate max-w-[120px]">
                                    {currentAccountName}
                                </span>
                                {/* Provider Badge */}
                                {currentProvider && (
                                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1", 
                                        currentProvider === 'activecampaign' ? "border-blue-200 text-blue-600 bg-blue-50" : 
                                        currentProvider === 'buttondown' ? "border-indigo-200 text-indigo-600 bg-indigo-50" :
                                        "border-orange-200 text-orange-600 bg-orange-50"
                                    )}>
                                        {currentProvider === 'activecampaign' ? 'AC' : currentProvider === 'buttondown' ? 'BD' : 'BM'}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {listName}
                            </span>
                        </div>
                        
                        {/* Bottom Line: Counters & Status */}
                        <div className="flex items-center gap-2 text-xs w-full">
                            <span className="font-mono font-medium text-foreground bg-muted px-1 rounded">
                                {currentStats.processed}/{totalItems}
                            </span>
                            
                            <span className={cn("capitalize flex items-center gap-1 flex-1", getStatusColor(selectedJob.status))}>
                                {selectedJob.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                                {selectedJob.status}
                            </span>

                            {/* Fail Counter */}
                            {currentStats.failures > 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5 py-0 text-[10px] ml-auto flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {currentStats.failures}
                                </Badge>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-secondary mt-1 rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full transition-all duration-300", 
                                    selectedJob.status === 'completed' ? "bg-green-500" : 
                                    selectedJob.status === 'failed' ? "bg-red-300" : "bg-blue-500"
                                )}
                                style={{ width: `${totalItems > 0 ? (currentStats.processed / totalItems) * 100 : 0}%` }}
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
                        <CommandEmpty>No tasks found.</CommandEmpty>
                        <CommandGroup heading="Active Jobs">
                            {jobList.map((job) => {
                                const jAny = job as any;
                                const stats = getJobStats(job);
                                const account = getAccount(jAny);
                                const accountName = account ? account.name : (jAny.title || "Unknown");
                                const provider = account ? account.provider : "";
                                const isActiveAccount = activeAccount && account && account.id === activeAccount.id;

                                return (
                                    <CommandItem
                                        key={job.id}
                                        value={`${accountName} ${jAny.listName} ${provider} ${job.id}`} 
                                        onSelect={() => {
                                            setSelectedJobId(job.id);
                                            // Click to Switch Account
                                            if (account && account.id !== activeAccount?.id) {
                                                setActiveAccount(account);
                                            }
                                            setOpen(false);
                                        }}
                                        className="flex flex-col items-start py-3 border-b last:border-0 cursor-pointer data-[selected=true]:bg-accent"
                                    >
                                        {/* Row 1: Name, Provider, and Check */}
                                        <div className="flex justify-between w-full items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate max-w-[140px]">
                                                    {accountName}
                                                </span>
                                                {/* Provider Badge in Dropdown */}
                                                {provider && (
                                                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1", 
                                                        provider === 'activecampaign' ? "border-blue-200 text-blue-600 bg-blue-50" : 
                                                        provider === 'buttondown' ? "border-indigo-200 text-indigo-600 bg-indigo-50" :
                                                        "border-orange-200 text-orange-600 bg-orange-50"
                                                    )}>
                                                        {provider === 'activecampaign' ? 'AC' : provider === 'buttondown' ? 'BD' : 'BM'}
                                                    </Badge>
                                                )}
                                            </div>
                                            {selectedJobId === job.id && <Check className="h-4 w-4 text-primary ml-auto" />}
                                        </div>

                                        {/* Row 2: Status and Counters */}
                                        <div className="flex justify-between items-center w-full text-xs">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className={cn("font-mono", isActiveAccount ? "text-primary font-bold" : "")}>
                                                    {stats.processed}/{job.totalItems}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {stats.failures > 0 && (
                                                    <span className="text-red-500 font-bold flex items-center gap-1">
                                                        <XCircle className="w-3 h-3" /> {stats.failures}
                                                    </span>
                                                )}
                                                <span className={cn("capitalize", getStatusColor(job.status))}>
                                                    {job.status}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Row 3: Mini Progress Bar */}
                                        <div className="w-full h-0.5 bg-muted mt-2 rounded-full overflow-hidden">
                                            <div 
                                                className={cn("h-full", getStatusColor(job.status).replace("text-", "bg-"))}
                                                style={{ width: `${job.totalItems > 0 ? (stats.processed / job.totalItems) * 100 : 0}%` }}
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