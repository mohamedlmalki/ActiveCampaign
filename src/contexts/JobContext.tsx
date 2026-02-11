import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Job {
  id: string;
  title: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  data: any[];
  results: any[];
  apiEndpoint: string;
  batchSize?: number;
  processItem: (item: any) => Promise<any>;
}

interface JobContextType {
  jobs: Job[];
  addJob: (jobData: Omit<Job, 'id' | 'processedItems' | 'failedItems' | 'status' | 'results'>) => void;
  startJob: (id: string) => void;
  pauseJob: (id: string) => void;
  resumeJob: (id: string) => void;
  removeJob: (id: string) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  // Use a ref to keep track of active jobs to avoid closure staleness in the loop
  const processingRef = useRef<Set<string>>(new Set());

  const processJobLoop = async (jobId: string) => {
    if (!processingRef.current.has(jobId)) return;

    setJobs(currentJobs => {
      const jobIndex = currentJobs.findIndex(j => j.id === jobId);
      if (jobIndex === -1) return currentJobs;
      
      const job = currentJobs[jobIndex];
      
      if (job.status === 'paused' || job.status === 'failed' || job.status === 'completed') {
        processingRef.current.delete(jobId);
        return currentJobs;
      }

      // If we are done
      if (job.processedItems >= job.totalItems) {
        processingRef.current.delete(jobId);
        const updatedJobs = [...currentJobs];
        updatedJobs[jobIndex] = { ...job, status: 'completed' };
        toast({ title: "Job Completed", description: `${job.title} finished.` });
        return updatedJobs;
      }

      // Get next batch
      const batchSize = job.batchSize || 1;
      const nextBatch = job.data.slice(job.processedItems, job.processedItems + batchSize);
      
      // We need to trigger the side effect (processing) outside the state setter if possible,
      // but for simplicity in this loop we'll do it here and update state after.
      // Ideally, we'd use a useEffect for this, but this is a simple job runner.
      
      // IMPORTANT: We cannot await inside the setState callback securely for side effects.
      // So we just return the state as is, and let the separate async function handle the processing
      // and then call setJobs again.
      return currentJobs;
    });

    // --- ACTUAL PROCESSING LOGIC ---
    // Fetch latest job state
    let currentJob: Job | undefined;
    setJobs(prev => {
        currentJob = prev.find(j => j.id === jobId);
        return prev;
    });

    if (!currentJob || currentJob.status !== 'processing' || currentJob.processedItems >= currentJob.totalItems) {
         processingRef.current.delete(jobId);
         return;
    }

    const batchSize = currentJob.batchSize || 1;
    const itemsToProcess = currentJob.data.slice(currentJob.processedItems, currentJob.processedItems + batchSize);
    
    const results = [];
    let failedCount = 0;

    for (const item of itemsToProcess) {
        try {
            const result = await currentJob.processItem(item);
            results.push({ status: 'success', data: result });
        } catch (error: any) {
            results.push({ status: 'error', error: error.message });
            failedCount++;
        }
    }

    // Update state with results
    setJobs(prev => prev.map(j => {
        if (j.id === jobId) {
            return {
                ...j,
                processedItems: j.processedItems + itemsToProcess.length,
                failedItems: j.failedItems + failedCount,
                results: [...j.results, ...results]
            };
        }
        return j;
    }));

    // Continue loop
    setTimeout(() => processJobLoop(jobId), 1000); // 1 sec delay between batches
  };

  const startJob = useCallback((id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'processing' } : j));
    if (!processingRef.current.has(id)) {
        processingRef.current.add(id);
        processJobLoop(id);
    }
  }, []);

  const addJob = useCallback((jobData: Omit<Job, 'id' | 'processedItems' | 'failedItems' | 'status' | 'results'>) => {
    const newJob: Job = {
      ...jobData,
      id: Math.random().toString(36).substring(7),
      processedItems: 0,
      failedItems: 0,
      status: 'pending',
      results: [],
    };
    setJobs((prev) => [...prev, newJob]);
    
    // Auto start after a brief delay
    setTimeout(() => startJob(newJob.id), 500);
  }, [startJob]);

  const pauseJob = useCallback((id: string) => {
     processingRef.current.delete(id);
     setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'paused' } : j));
  }, []);

  const resumeJob = useCallback((id: string) => {
      startJob(id);
  }, [startJob]);

  const removeJob = useCallback((id: string) => {
    processingRef.current.delete(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return (
    <JobContext.Provider value={{ jobs, addJob, startJob, pauseJob, resumeJob, removeJob }}>
      {children}
    </JobContext.Provider>
  );
};

// --- THIS WAS LIKELY MISSING OR NOT EXPORTED CORRECTLY ---
export const useJob = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
};