
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { logger } from '@/lib/logger';

const STORAGE_KEY = 'lovable_batch_jobs';

export interface StoredBatchJob extends BatchJob {
  payeeNames: string[];
  originalFileData: any[];
  createdAt: number;
}

/**
 * Save batch jobs to localStorage
 */
export function saveBatchJobs(jobs: StoredBatchJob[]): void {
  try {
    const validJobs = jobs.filter(job => isValidBatchJob(job));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validJobs));
    logger.info(`[BATCH STORAGE] Saved ${validJobs.length} batch jobs to localStorage`);
  } catch (error) {
    logger.error('[BATCH STORAGE] Failed to save batch jobs:', error);
  }
}

/**
 * Load batch jobs from localStorage
 */
export function loadBatchJobs(): StoredBatchJob[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const jobs: StoredBatchJob[] = JSON.parse(stored);
    const validJobs = jobs.filter(job => isValidBatchJob(job));
    
    logger.info(`[BATCH STORAGE] Loaded ${validJobs.length} batch jobs from localStorage`);
    return validJobs;
  } catch (error) {
    logger.error('[BATCH STORAGE] Failed to load batch jobs:', error);
    return [];
  }
}

/**
 * Add a new batch job to storage
 */
export function addBatchJob(job: BatchJob, payeeNames: string[], originalFileData: any[]): void {
  const jobs = loadBatchJobs();
  const storedJob: StoredBatchJob = {
    ...job,
    payeeNames,
    originalFileData,
    createdAt: Date.now()
  };
  
  jobs.unshift(storedJob); // Add to beginning
  saveBatchJobs(jobs);
}

/**
 * Update an existing batch job in storage
 */
export function updateBatchJob(updatedJob: BatchJob): void {
  const jobs = loadBatchJobs();
  const index = jobs.findIndex(job => job.id === updatedJob.id);
  
  if (index !== -1) {
    jobs[index] = { ...jobs[index], ...updatedJob };
    saveBatchJobs(jobs);
    logger.info(`[BATCH STORAGE] Updated job ${updatedJob.id}`);
  }
}

/**
 * Remove a batch job from storage
 */
export function removeBatchJob(jobId: string): void {
  const jobs = loadBatchJobs();
  const filteredJobs = jobs.filter(job => job.id !== jobId);
  saveBatchJobs(filteredJobs);
  logger.info(`[BATCH STORAGE] Removed job ${jobId}`);
}

/**
 * Validate that a job ID looks like a real OpenAI batch job ID
 */
export function isValidBatchJobId(jobId: string): boolean {
  // Real OpenAI batch IDs start with "batch_" followed by alphanumeric characters
  return /^batch_[a-zA-Z0-9]{24,}$/.test(jobId);
}

/**
 * Check if a stored batch job is valid
 */
function isValidBatchJob(job: any): job is StoredBatchJob {
  return (
    job &&
    typeof job.id === 'string' &&
    isValidBatchJobId(job.id) &&
    Array.isArray(job.payeeNames) &&
    Array.isArray(job.originalFileData) &&
    typeof job.status === 'string'
  );
}

/**
 * Clean up expired or invalid jobs
 */
export function cleanupBatchJobs(): void {
  const jobs = loadBatchJobs();
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const validJobs = jobs.filter(job => {
    // Remove jobs older than 1 week or with invalid IDs
    if (job.createdAt < oneWeekAgo) {
      logger.info(`[BATCH STORAGE] Removing old job ${job.id}`);
      return false;
    }
    
    if (!isValidBatchJobId(job.id)) {
      logger.info(`[BATCH STORAGE] Removing invalid job ID ${job.id}`);
      return false;
    }
    
    return true;
  });
  
  if (validJobs.length !== jobs.length) {
    saveBatchJobs(validJobs);
    logger.info(`[BATCH STORAGE] Cleaned up ${jobs.length - validJobs.length} invalid jobs`);
  }
}
