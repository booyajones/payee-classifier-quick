
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { StoredBatchJob } from '@/lib/storage/batchJobStorage';
import {
  isSupabaseConfigured,
  saveJobToSupabase,
  archiveJobInSupabase,
  updateJobInSupabase,
  syncBatchJobs
} from '@/lib/storage/supabaseBatchStorage';
import { logger } from '@/lib/logger';

export const usePersistentBatchJobs = () => {
  const [batchJobs, setBatchJobs] = useState<StoredBatchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Load jobs on mount with sync
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const jobs = await syncBatchJobs();
      setBatchJobs(jobs);
      
      if (isSupabaseConfigured()) {
        logger.info('[PERSISTENT JOBS] Loaded jobs with Supabase sync');
      } else {
        logger.info('[PERSISTENT JOBS] Loaded jobs from localStorage only');
      }
    } catch (error) {
      logger.error('[PERSISTENT JOBS] Failed to load jobs:', error);
      toast({
        title: "Storage Error",
        description: "Failed to load batch jobs. Using local storage fallback.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addJob = async (job: BatchJob, payeeNames: string[], originalFileData: any[]) => {
    const storedJob: StoredBatchJob = {
      ...job,
      payeeNames,
      originalFileData,
      createdAt: Date.now(),
      isMockJob: false
    };

    try {
      // Save to localStorage immediately
      const { addBatchJob } = await import('@/lib/storage/batchJobStorage');
      addBatchJob(job, payeeNames, originalFileData, false);

      // Save to Supabase in background
      if (isSupabaseConfigured()) {
        await saveJobToSupabase(storedJob);
      }

      // Update local state
      setBatchJobs(prev => [storedJob, ...prev]);

      logger.info(`[PERSISTENT JOBS] Added job ${job.id} with persistent storage`);
    } catch (error) {
      logger.error(`[PERSISTENT JOBS] Failed to add job ${job.id}:`, error);
      toast({
        title: "Storage Warning",
        description: "Job saved locally but may not sync across devices.",
        variant: "destructive"
      });
    }
  };

  const updateJob = async (updatedJob: BatchJob) => {
    try {
      // Update localStorage
      const { updateBatchJob } = await import('@/lib/storage/batchJobStorage');
      updateBatchJob(updatedJob);

      // Update Supabase in background
      if (isSupabaseConfigured()) {
        await updateJobInSupabase(updatedJob);
      }

      // Update local state
      setBatchJobs(prev => prev.map(job => 
        job.id === updatedJob.id ? { ...job, ...updatedJob } : job
      ));

      logger.info(`[PERSISTENT JOBS] Updated job ${updatedJob.id}`);
    } catch (error) {
      logger.error(`[PERSISTENT JOBS] Failed to update job ${updatedJob.id}:`, error);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      // Remove from localStorage
      const { removeBatchJob } = await import('@/lib/storage/batchJobStorage');
      removeBatchJob(jobId);

      // Archive in Supabase (soft delete)
      if (isSupabaseConfigured()) {
        await archiveJobInSupabase(jobId);
      }

      // Update local state
      setBatchJobs(prev => prev.filter(job => job.id !== jobId));

      logger.info(`[PERSISTENT JOBS] Deleted job ${jobId}`);
    } catch (error) {
      logger.error(`[PERSISTENT JOBS] Failed to delete job ${jobId}:`, error);
      toast({
        title: "Delete Warning",
        description: "Job removed locally but may still exist in cloud storage.",
        variant: "destructive"
      });
    }
  };

  const syncJobs = async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      const jobs = await syncBatchJobs();
      setBatchJobs(jobs);
      
      toast({
        title: "Sync Complete",
        description: `Synchronized ${jobs.length} batch jobs.`
      });
    } catch (error) {
      logger.error('[PERSISTENT JOBS] Manual sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync jobs. Check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    batchJobs,
    isLoading,
    isSyncing,
    isSupabaseConfigured: isSupabaseConfigured(),
    addJob,
    updateJob,
    deleteJob,
    syncJobs,
    refreshJobs: loadJobs
  };
};
