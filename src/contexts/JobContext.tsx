import React, { createContext, useState, useContext, ReactNode, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAccount } from './AccountContext';
import { toast } from "@/components/ui/use-toast";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Job {
    id: string;
    accountId: string;
    listId: string;
    listName: string;
    status: 'running' | 'paused' | 'completed' | 'cancelled';
    progress: number;
    results: ImportResult[];
    totalContacts: number;
    elapsedTime: number;
    delay: number;
}

interface ImportResult {
    index: number;
    email: string;
    status: 'success' | 'failed';
    data: string;
}

interface JobContextType {
    jobs: Record<string, Job>;
    // Updated signature to accept defaultFirstName
    startJob: (accountId: string, listId: string, listName: string, importData: string, delay: number, defaultFirstName?: string) => void;
    pauseJob: (jobId: string) => void;
    resumeJob: (jobId: string) => void;
    cancelJob: (jobId: string) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider = ({ children }: { children: ReactNode }) => {
    const { accounts } = useAccount();
    const [jobs, setJobs] = useState<Record<string, Job>>({});
    const jobControlRefs = useRef<Record<string, { isPaused: boolean; isCancelled: boolean }>>({});
    
    useEffect(() => {
        const timer = setInterval(() => {
            setJobs(prevJobs => {
                const newJobs = { ...prevJobs };
                let hasChanged = false;
                for (const jobId in newJobs) {
                    if (newJobs[jobId].status === 'running') {
                        newJobs[jobId] = { ...newJobs[jobId], elapsedTime: newJobs[jobId].elapsedTime + 1 };
                        hasChanged = true;
                    }
                }
                return hasChanged ? newJobs : prevJobs;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Updated startJob function
    const startJob = useCallback(async (accountId: string, listId: string, listName: string, importData: string, delay: number, defaultFirstName?: string) => {
        const account = accounts.find(acc => acc.id === accountId);
        if (!account) {
            toast({ title: "Account not found", variant: "destructive" });
            return;
        }

        const contacts = importData.split('\n').filter(line => line.trim() !== '').map(line => {
            const parts = line.split(',');
            return {
                email: parts[0]?.trim(),
                // Use the CSV name IF it exists, otherwise use defaultFirstName, otherwise empty
                firstName: parts[1]?.trim() || defaultFirstName || '',
                lastName: parts[2]?.trim() || ''
            };
        });

        if (contacts.length === 0) {
            toast({ title: "No contacts to import", variant: "destructive" });
            return;
        }

        const jobId = uuidv4();
        jobControlRefs.current[jobId] = { isPaused: false, isCancelled: false };

        const newJob: Job = {
            id: jobId,
            accountId,
            listId: listId,
            listName: listName,
            status: 'running',
            progress: 0,
            results: [],
            totalContacts: contacts.length,
            elapsedTime: 0,
            delay,
        };

        setJobs(prev => {
            const otherJobs = Object.fromEntries(
                Object.entries(prev).filter(([_, job]) => job.accountId !== accountId)
            );
            return { ...otherJobs, [jobId]: newJob };
        });

        for (let i = 0; i < contacts.length; i++) {
            const controls = jobControlRefs.current[jobId];
            if (!controls || controls.isCancelled) {
                setJobs(prev => (prev[jobId] ? { ...prev, [jobId]: { ...prev[jobId], status: 'cancelled' } } : prev));
                toast({ title: `Job for ${listName} cancelled` });
                break;
            }
            while (controls.isPaused) {
                await sleep(500);
            }

            const contact = contacts[i];
            if (i > 0) await sleep(delay * 1000);

            try {
                let endpoint = '';
                let payload = {};

                if (account.provider === 'benchmark') {
                    endpoint = '/api/benchmark/import/contact';
                    payload = { apiKey: account.apiKey, listId: listId, contact: contact };
                } else {
                    endpoint = '/api/activecampaign/import/contact';
                    payload = { apiKey: account.apiKey, apiUrl: account.apiUrl, listId: listId, contact: contact };
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                if (!response.ok) throw data;

                setJobs(prev => {
                    const currentJob = prev[jobId];
                    if (!currentJob) return prev;
                    const newResult: ImportResult = { index: i + 1, email: contact.email, status: 'success', data: JSON.stringify(data) };
                    return {
                        ...prev,
                        [jobId]: { ...currentJob, results: [newResult, ...currentJob.results], progress: ((i + 1) / currentJob.totalContacts) * 100 }
                    };
                });

            } catch (error) {
                setJobs(prev => {
                    const currentJob = prev[jobId];
                    if (!currentJob) return prev;
                    const newResult: ImportResult = { index: i + 1, email: contact.email, status: 'failed', data: JSON.stringify(error) };
                    return {
                        ...prev,
                        [jobId]: { ...currentJob, results: [newResult, ...currentJob.results], progress: ((i + 1) / currentJob.totalContacts) * 100 }
                    };
                });
            }
        }
        
        if (jobControlRefs.current[jobId] && !jobControlRefs.current[jobId].isCancelled) {
             setJobs(prev => {
                const currentJob = prev[jobId];
                if (!currentJob) return prev;
                return { ...prev, [jobId]: { ...currentJob, status: 'completed', progress: 100 } }
             });
        }
    }, [accounts]);

    const pauseJob = (jobId: string) => {
        if(jobControlRefs.current[jobId]) {
            jobControlRefs.current[jobId].isPaused = true;
            setJobs(prev => ({ ...prev, [jobId]: { ...prev[jobId], status: 'paused' } }));
        }
    };

    const resumeJob = (jobId: string) => {
        if(jobControlRefs.current[jobId]) {
            jobControlRefs.current[jobId].isPaused = false;
            setJobs(prev => ({ ...prev, [jobId]: { ...prev[jobId], status: 'running' } }));
        }
    };

    const cancelJob = (jobId: string) => {
        if(jobControlRefs.current[jobId]) {
            jobControlRefs.current[jobId].isCancelled = true;
        }
    };

    return (
        <JobContext.Provider value={{ jobs, startJob, pauseJob, resumeJob, cancelJob }}>
            {children}
        </JobContext.Provider>
    );
};

export const useJobs = () => {
    const context = useContext(JobContext);
    if (context === undefined) {
        throw new Error('useJobs must be used within a JobProvider');
    }
    return context;
};