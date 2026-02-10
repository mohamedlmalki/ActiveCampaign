import { useState } from "react";
import { Check, ChevronsUpDown, AlertCircle, PlayCircle, PauseCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/contexts/JobContext"; 
import { useAccount } from "@/contexts/AccountContext";

export function CampaignStatusSelect() {
    const { jobs } = useJobs(); 
    const { accounts, activeAccount, setActiveAccount } = useAccount(); // Added setActiveAccount
    const [open, setOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string>("");

    // Convert jobs object to array and reverse (newest first)
    const jobList = Object.values(jobs).reverse();

    // Determine the "Active" job to show on the closed button
    const activeRunningJob = jobList.find(j => j.status === 'running');
    const selectedJob = jobList.find((j) => j.id === selectedJobId) || activeRunningJob || jobList[0];

    // Helper: Find Full Account Object
    const getAccount = (accountId: string) => {
        return accounts.find(a => a.id === accountId);
    };

    // Helper: Calculate Stats
    const getJobStats = (job: typeof jobList[0]) => {
        const processed = job.results.length;
        const failures = job.results.filter(r => r.status === 'failed').length;
        return { processed, failures };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return "text-green-600";
            case 'running': return "text-blue-600";
            case 'paused': return "text-yellow-600";
            case 'cancelled': return "text-red-500";
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
    const currentAccount = getAccount(selectedJob.accountId);
    const currentAccountName = currentAccount ? currentAccount.name : "Unknown";
    const currentProvider = currentAccount ? currentAccount.provider : "";

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
                                        "border-orange-200 text-orange-600 bg-orange-50"
                                    )}>
                                        {currentProvider === 'activecampaign' ? 'AC' : 'BM'}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {selectedJob.listName}
                            </span>
                        </div>
                        
                        {/* Bottom Line: Counters & Status */}
                        <div className="flex items-center gap-2 text-xs w-full">
                            <span className="font-mono font-medium text-foreground bg-muted px-1 rounded">
                                {currentStats.processed}/{selectedJob.totalContacts}
                            </span>
                            
                            <span className={cn("capitalize flex items-center gap-1 flex-1", getStatusColor(selectedJob.status))}>
                                {selectedJob.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
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
                                    selectedJob.status === 'cancelled' ? "bg-red-300" : "bg-blue-500"
                                )}
                                style={{ width: `${(currentStats.processed / selectedJob.totalContacts) * 100}%` }}
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
                                const stats = getJobStats(job);
                                const account = getAccount(job.accountId);
                                const accountName = account ? account.name : "Unknown";
                                const provider = account ? account.provider : "";
                                const isActiveAccount = activeAccount && job.accountId === activeAccount.id;

                                return (
                                    <CommandItem
                                        key={job.id}
                                        value={`${accountName} ${job.listName} ${provider}`} 
                                        onSelect={() => {
                                            setSelectedJobId(job.id);
                                            // ---------------------------------------------------------
                                            // OPTION 2: CLICK TO SWITCH ACCOUNT
                                            // ---------------------------------------------------------
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
                                                        "border-orange-200 text-orange-600 bg-orange-50"
                                                    )}>
                                                        {provider === 'activecampaign' ? 'AC' : 'BM'}
                                                    </Badge>
                                                )}
                                            </div>
                                            {selectedJobId === job.id && <Check className="h-4 w-4 text-primary ml-auto" />}
                                        </div>

                                        {/* Row 2: Status and Counters */}
                                        <div className="flex justify-between items-center w-full text-xs">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className={cn("font-mono", isActiveAccount ? "text-primary font-bold" : "")}>
                                                    {stats.processed}/{job.totalContacts}
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
                                                style={{ width: `${(stats.processed / job.totalContacts) * 100}%` }}
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