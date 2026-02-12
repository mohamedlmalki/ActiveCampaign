import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Job {
  id: string;
  title: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  // Added 'stopped' status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused' | 'stopped';
  data: any[];
  results: any[];
  apiEndpoint: string;
  batchSize?: number;
  processItem: (item: any) => Promise<any>;
  
  // Time Tracking
  startTime: number;
  endTime?: number;
  pauseStartTime?: number;  // When did we hit pause?
  totalPausedTime: number;  // How long have we been paused in total?
}

interface JobContextType {
  jobs: Job[];
  addJob: (jobData: Omit<Job, 'id' | 'processedItems' | 'failedItems' | 'status' | 'results' | 'startTime' | 'endTime' | 'totalPausedTime'>) => string;
  startJob: (id: string) => void;
  pauseJob: (id: string) => void;
  resumeJob: (id: string) => void;
  stopJob: (id: string) => void; // <--- NEW FUNCTION
  removeJob: (id: string) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const jobsRef = useRef<Job[]>([]);
  
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const processingRef = useRef<Set<string>>(new Set());

  const processJobLoop = async (jobId: string) => {
    // 1. Safety Checks
    if (!processingRef.current.has(jobId)) return;
    const currentJob = jobsRef.current.find(j => j.id === jobId);
    
    // Stop if job missing or not processing
    if (!currentJob || currentJob.status !== 'processing') {
         processingRef.current.delete(jobId);
         return;
    }

    // 2. Completion Check
    if (currentJob.processedItems >= currentJob.totalItems) {
        processingRef.current.delete(jobId);
        updateJob(jobId, { status: 'completed', endTime: Date.now() });
        toast({ title: "Job Completed", description: `${currentJob.title} finished.` });
        return;
    }

    // 3. Process Batch
    const batchSize = currentJob.batchSize || 1;
    const itemsToProcess = currentJob.data.slice(currentJob.processedItems, currentJob.processedItems + batchSize);
    
    const newResults = [];
    let newFailures = 0;

    for (const item of itemsToProcess) {
        try {
            const result = await currentJob.processItem(item);
            newResults.push({ status: 'success', data: result });
        } catch (error: any) {
            newResults.push({ status: 'error', error: error.message || "Unknown error", data: item });
            newFailures++;
        }
    }

    // 4. Update State
    setJobs(prev => prev.map(j => {
        if (j.id === jobId) {
            return {
                ...j,
                processedItems: j.processedItems + itemsToProcess.length,
                failedItems: j.failedItems + newFailures,
                results: [...j.results, ...newResults]
            };
        }
        return j;
    }));

    // 5. Loop
    setTimeout(() => processJobLoop(jobId), 1000); 
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const startJob = useCallback((id: string) => {
    updateJob(id, { status: 'processing' });
    if (!processingRef.current.has(id)) {
        processingRef.current.add(id);
        setTimeout(() => processJobLoop(id), 100);
    }
  }, []);

  const addJob = useCallback((jobData: Omit<Job, 'id' | 'processedItems' | 'failedItems' | 'status' | 'results' | 'startTime' | 'endTime' | 'totalPausedTime'>) => {
    const id = Math.random().toString(36).substring(7);
    const newJob: Job = {
      ...jobData,
      id,
      processedItems: 0,
      failedItems: 0,
      status: 'pending',
      results: [],
      startTime: Date.now(),
      totalPausedTime: 0 // Init to 0
    };
    setJobs((prev) => [...prev, newJob]);
    setTimeout(() => startJob(id), 500);
    return id;
  }, [startJob]);

  // --- PAUSE LOGIC ---
  const pauseJob = useCallback((id: string) => {
     processingRef.current.delete(id);
     updateJob(id, { 
         status: 'paused', 
         pauseStartTime: Date.now() // Track when we paused
     });
  }, []);

  // --- RESUME LOGIC ---
  const resumeJob = useCallback((id: string) => {
      setJobs(prev => prev.map(j => {
          if (j.id !== id) return j;
          // Calculate how long we were paused
          const pausedDuration = j.pauseStartTime ? (Date.now() - j.pauseStartTime) : 0;
          return {
              ...j,
              status: 'processing',
              pauseStartTime: undefined, // Clear pause start
              totalPausedTime: j.totalPausedTime + pausedDuration // Add to total
          };
      }));
      
      // Restart loop
      if (!processingRef.current.has(id)) {
        processingRef.current.add(id);
        setTimeout(() => processJobLoop(id), 100);
    }
  }, []);

  // --- STOP LOGIC (NEW) ---
  const stopJob = useCallback((id: string) => {
      processingRef.current.delete(id);
      // Mark as stopped, set end time, but DO NOT delete data
      updateJob(id, { status: 'stopped', endTime: Date.now() });
      toast({ title: "Job Stopped", description: "Processing halted. Data preserved." });
  }, []);

  const removeJob = useCallback((id: string) => {
    processingRef.current.delete(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return (
    <JobContext.Provider value={{ jobs, addJob, startJob, pauseJob, resumeJob, stopJob, removeJob }}>
      {children}
    </JobContext.Provider>
  );
};

export const useJob = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
};