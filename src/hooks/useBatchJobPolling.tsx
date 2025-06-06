
import { useState, useEffect, useRef } from 'react';
import { BatchJob, checkBatchJobStatus } from '@/lib/openai/trueBatchAPI';
import { useToast } from '@/components/ui/use-toast';

interface PollingState {
  isPolling: boolean;
  pollCount: number;
  lastError?: string;
  lastSuccessfulPoll?: number;
  isRateLimited?: boolean;
  consecutiveFailures?: number;
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

  // Calculate progressive polling interval with rate limit consideration
  const getPollingInterval = (pollCount: number, isRateLimited: boolean = false, consecutiveFailures: number = 0): number => {
    // Base intervals
    let interval: number;
    if (pollCount < 5) interval = 5000; // 5s for first 5 polls
    else if (pollCount < 15) interval = 10000; // 10s for next 10 polls
    else interval = 30000; // 30s after that

    // Apply rate limiting backoff
    if (isRateLimited) {
      interval = Math.min(interval * 2, 120000); // Double but cap at 2 minutes
    }

    // Apply failure backoff
    if (consecutiveFailures > 0) {
      interval = Math.min(interval * Math.pow(1.5, consecutiveFailures), 300000); // Cap at 5 minutes
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 + 0.85; // 85-115% of calculated interval
    return Math.floor(interval * jitter);
  };

  // Get timeout based on conditions
  const getRequestTimeout = (consecutiveFailures: number, isRateLimited: boolean): number => {
    let timeout = 30000; // Base 30s timeout
    
    if (isRateLimited) {
      timeout = 45000; // Longer timeout for rate limited requests
    }
    
    if (consecutiveFailures > 2) {
      timeout = 60000; // Even longer for repeated failures
    }
    
    return timeout;
  };

  // Check if error is rate limiting
  const isRateLimitError = (error: any): boolean => {
    const errorMessage = error?.message || '';
    return errorMessage.includes('429') || 
           errorMessage.includes('rate limit') ||
           errorMessage.includes('quota exceeded');
  };

  // Start polling for a specific job
  const startPolling = (jobId: string) => {
    // Don't start if already polling
    if (pollingStates[jobId]?.isPolling) return;

    console.log(`[POLLING] Starting polling for job ${jobId}`);
    
    setPollingStates(prev => ({
      ...prev,
      [jobId]: { 
        isPolling: true, 
        pollCount: 0, 
        consecutiveFailures: 0,
        lastSuccessfulPoll: Date.now()
      }
    }));

    const pollJob = async (currentPollCount: number) => {
      const currentState = pollingStates[jobId] || {};
      const consecutiveFailures = currentState.consecutiveFailures || 0;
      const isRateLimited = currentState.isRateLimited || false;

      try {
        console.log(`[POLLING] Poll #${currentPollCount + 1} for job ${jobId} (failures: ${consecutiveFailures})`);
        
        // Create timeout promise
        const timeout = getRequestTimeout(consecutiveFailures, isRateLimited);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const updatedJob = await checkBatchJobStatus(jobId);
          clearTimeout(timeoutId);
          onJobUpdate(updatedJob);

          setPollingStates(prev => ({
            ...prev,
            [jobId]: { 
              ...prev[jobId], 
              pollCount: currentPollCount + 1,
              lastError: undefined,
              lastSuccessfulPoll: Date.now(),
              isRateLimited: false,
              consecutiveFailures: 0
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
          const nextInterval = getPollingInterval(currentPollCount + 1, false, 0);
          intervalRefs.current[jobId] = setTimeout(() => {
            pollJob(currentPollCount + 1);
          }, nextInterval);

        } catch (requestError) {
          clearTimeout(timeoutId);
          throw requestError;
        }

      } catch (error) {
        console.error(`[POLLING] Error polling job ${jobId}:`, error);
        
        const isRateLimit = isRateLimitError(error);
        const newConsecutiveFailures = consecutiveFailures + 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setPollingStates(prev => ({
          ...prev,
          [jobId]: { 
            ...prev[jobId], 
            lastError: errorMessage,
            pollCount: currentPollCount + 1,
            isRateLimited: isRateLimit,
            consecutiveFailures: newConsecutiveFailures
          }
        }));

        // Show user-friendly error message
        if (isRateLimit) {
          if (newConsecutiveFailures === 1) {
            toast({
              title: "Rate Limited",
              description: `Polling slowed down for job ${jobId.slice(-8)} due to API limits. Will continue checking...`,
              variant: "default",
            });
          }
        }

        // Stop polling after too many failures, but allow longer for rate limits
        const maxFailures = isRateLimit ? 8 : 5;
        if (newConsecutiveFailures >= maxFailures) {
          console.error(`[POLLING] Stopping polling for job ${jobId} after ${newConsecutiveFailures} failures`);
          
          if (intervalRefs.current[jobId]) {
            clearInterval(intervalRefs.current[jobId]);
            delete intervalRefs.current[jobId];
          }
          
          setPollingStates(prev => ({
            ...prev,
            [jobId]: { ...prev[jobId], isPolling: false }
          }));
          
          toast({
            title: isRateLimit ? "Polling Paused" : "Polling Error",
            description: isRateLimit 
              ? `Paused polling job ${jobId.slice(-8)} due to persistent rate limits. Use manual refresh.`
              : `Stopped polling job ${jobId.slice(-8)} due to repeated errors.`,
            variant: "destructive",
          });
          return;
        }

        // Retry with backoff
        const retryDelay = getPollingInterval(currentPollCount + 1, isRateLimit, newConsecutiveFailures);
        console.log(`[POLLING] Retrying job ${jobId} in ${retryDelay}ms (failure ${newConsecutiveFailures})`);
        
        intervalRefs.current[jobId] = setTimeout(() => {
          pollJob(currentPollCount + 1);
        }, retryDelay);
      }
    };

    // Start polling immediately
    pollJob(0);
  };

  // Manual refresh function
  const manualRefresh = async (jobId: string) => {
    try {
      console.log(`[POLLING] Manual refresh for job ${jobId}`);
      const updatedJob = await checkBatchJobStatus(jobId);
      onJobUpdate(updatedJob);
      
      setPollingStates(prev => ({
        ...prev,
        [jobId]: { 
          ...prev[jobId], 
          lastError: undefined,
          lastSuccessfulPoll: Date.now(),
          consecutiveFailures: 0,
          isRateLimited: false
        }
      }));
      
      toast({
        title: "Status Updated",
        description: `Job ${jobId.slice(-8)} status refreshed manually.`,
      });
      
      return updatedJob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPollingStates(prev => ({
        ...prev,
        [jobId]: { 
          ...prev[jobId], 
          lastError: errorMessage
        }
      }));
      
      toast({
        title: "Manual Refresh Failed",
        description: `Failed to refresh job ${jobId.slice(-8)}: ${errorMessage}`,
        variant: "destructive",
      });
      
      throw error;
    }
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
    cleanupPolling,
    manualRefresh
  };
};
