
import { useState, useEffect, useRef } from 'react';
import { BatchJob, checkBatchJobStatus } from '@/lib/openai/trueBatchAPI';
import { useToast } from '@/components/ui/use-toast';

interface PollingState {
  isPolling: boolean;
  pollCount: number;
  lastError?: string;
}

export const useBatchJobPolling = (
  jobs: BatchJob[],
  onJobUpdate: (job: BatchJob) => void
) => {
  const [pollingStates, setPollingStates] = useState<Record<string, PollingState>>({});
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const { toast } = useToast();

  // Cleanup function to clear all intervals
  const cleanupPolling = () => {
    Object.values(intervalRefs.current).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    intervalRefs.current = {};
    setPollingStates({});
  };

  // Calculate progressive polling interval
  const getPollingInterval = (pollCount: number): number => {
    if (pollCount < 5) return 5000; // 5s for first 5 polls
    if (pollCount < 15) return 10000; // 10s for next 10 polls
    return 30000; // 30s after that
  };

  // Start polling for a specific job
  const startPolling = (jobId: string) => {
    // Don't start if already polling
    if (pollingStates[jobId]?.isPolling) return;

    console.log(`[POLLING] Starting polling for job ${jobId}`);
    
    setPollingStates(prev => ({
      ...prev,
      [jobId]: { isPolling: true, pollCount: 0 }
    }));

    const pollJob = async (currentPollCount: number) => {
      try {
        console.log(`[POLLING] Poll #${currentPollCount + 1} for job ${jobId}`);
        
        const updatedJob = await checkBatchJobStatus(jobId);
        onJobUpdate(updatedJob);

        setPollingStates(prev => ({
          ...prev,
          [jobId]: { 
            ...prev[jobId], 
            pollCount: currentPollCount + 1,
            lastError: undefined
          }
        }));

        // Check if job is complete
        if (['completed', 'failed', 'expired', 'cancelled'].includes(updatedJob.status)) {
          console.log(`[POLLING] Job ${jobId} completed with status: ${updatedJob.status}`);
          
          if (intervalRefs.current[jobId]) {
            clearInterval(intervalRefs.current[jobId]);
            delete intervalRefs.current[jobId];
          }
          
          setPollingStates(prev => ({
            ...prev,
            [jobId]: { ...prev[jobId], isPolling: false }
          }));

          if (updatedJob.status === 'completed') {
            toast({
              title: "Batch Job Completed",
              description: `Job ${jobId.slice(-8)} has finished processing.`,
            });
          }
          return;
        }

        // Continue polling with progressive interval
        const nextInterval = getPollingInterval(currentPollCount + 1);
        intervalRefs.current[jobId] = setTimeout(() => {
          pollJob(currentPollCount + 1);
        }, nextInterval);

      } catch (error) {
        console.error(`[POLLING] Error polling job ${jobId}:`, error);
        
        setPollingStates(prev => ({
          ...prev,
          [jobId]: { 
            ...prev[jobId], 
            lastError: error instanceof Error ? error.message : 'Unknown error',
            pollCount: currentPollCount + 1
          }
        }));

        // Stop polling after 3 consecutive errors
        if (currentPollCount >= 3) {
          console.error(`[POLLING] Stopping polling for job ${jobId} after repeated errors`);
          
          if (intervalRefs.current[jobId]) {
            clearInterval(intervalRefs.current[jobId]);
            delete intervalRefs.current[jobId];
          }
          
          setPollingStates(prev => ({
            ...prev,
            [jobId]: { ...prev[jobId], isPolling: false }
          }));
          
          toast({
            title: "Polling Error",
            description: `Stopped polling job ${jobId.slice(-8)} due to repeated errors.`,
            variant: "destructive",
          });
          return;
        }

        // Retry with exponential backoff
        const retryDelay = Math.min(5000 * Math.pow(2, currentPollCount), 30000);
        intervalRefs.current[jobId] = setTimeout(() => {
          pollJob(currentPollCount + 1);
        }, retryDelay);
      }
    };

    // Start polling immediately
    pollJob(0);
  };

  // Auto-start polling for active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(job => 
      ['validating', 'in_progress', 'finalizing'].includes(job.status)
    );

    activeJobs.forEach(job => {
      if (!pollingStates[job.id]?.isPolling) {
        startPolling(job.id);
      }
    });

    // Cleanup function
    return () => {
      cleanupPolling();
    };
  }, [jobs]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanupPolling;
  }, []);

  return {
    pollingStates,
    startPolling,
    cleanupPolling
  };
};
