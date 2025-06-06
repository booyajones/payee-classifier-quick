import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { BatchJob, getBatchJobResults, cancelBatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { createPayeeClassification } from "@/lib/utils";
import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";
import { handleError, showErrorToast, showRetryableErrorToast } from "@/lib/errorHandler";
import { useRetry } from "@/hooks/useRetry";
import { checkKeywordExclusion } from "@/lib/classification/enhancedKeywordExclusion";
import ConfirmationDialog from "./ConfirmationDialog";
import BatchJobCard from "./batch/BatchJobCard";

interface BatchJobManagerProps {
  jobs: BatchJob[];
  payeeNamesMap: Record<string, string[]>;
  originalFileDataMap: Record<string, any[]>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobManager = ({ 
  jobs, 
  payeeNamesMap, 
  originalFileDataMap,
  onJobUpdate, 
  onJobComplete, 
  onJobDelete 
}: BatchJobManagerProps) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });
  const { toast } = useToast();

  // Use the polling hook (no auto-start)
  const { pollingStates, manualRefresh } = useBatchJobPolling(jobs, onJobUpdate);

  // Retry mechanism for operations
  const {
    execute: downloadResultsWithRetry,
    isRetrying: isDownloadRetrying
  } = useRetry(getBatchJobResults, { maxRetries: 3, baseDelay: 2000 });

  // Manual refresh - triggers single check + starts auto-polling
  const handleManualRefresh = async (jobId: string) => {
    setRefreshingJobs(prev => new Set(prev).add(jobId));
    try {
      console.log(`[BATCH MANAGER] Manual refresh for job ${jobId}`);
      await manualRefresh(jobId);
    } catch (error) {
      console.error(`[BATCH MANAGER] Manual refresh failed for job ${jobId}:`, error);
    } finally {
      setRefreshingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleDownloadResults = async (job: BatchJob) => {
    setDownloadingJobs(prev => new Set(prev).add(job.id));
    
    try {
      console.log(`[BATCH MANAGER] Downloading results for job ${job.id}`);
      const payeeNames = payeeNamesMap[job.id] || [];
      const originalFileData = originalFileDataMap[job.id] || [];
      
      console.log(`[BATCH MANAGER] Original file data for job ${job.id}:`, {
        hasData: originalFileData.length > 0,
        dataLength: originalFileData.length,
        sampleData: originalFileData.slice(0, 2)
      });
      
      if (payeeNames.length === 0) {
        throw new Error('No payee names found for this job. The job data may be corrupted.');
      }

      // Create original row indexes array - assume sequential for now
      const originalRowIndexes = payeeNames.map((_, index) => index);

      // Get raw results from OpenAI with enhanced index handling
      const rawResults = await downloadResultsWithRetry(job, payeeNames, originalRowIndexes);
      
      console.log(`[BATCH MANAGER] Raw results sample:`, rawResults.slice(0, 3));
      
      // Process results with enhanced validation and keyword exclusions
      const classifications = payeeNames.map((name, arrayIndex) => {
        const rawResult = rawResults[arrayIndex];
        
        // Determine the correct row index for original data
        const originalRowIndex = rawResult?.originalRowIndex ?? arrayIndex;
        const originalRowData = originalFileData[originalRowIndex] || originalFileData[arrayIndex] || {};
        
        console.log(`[BATCH MANAGER] Processing ${name} at arrayIndex ${arrayIndex}, originalRowIndex ${originalRowIndex}`);
        
        // Apply keyword exclusion check
        const keywordExclusion = checkKeywordExclusion(name);
        
        // Create enhanced classification result
        let classification: 'Business' | 'Individual' = 'Individual';
        let confidence = 0;
        let reasoning = 'No result available';
        let processingTier: any = 'Failed';
        
        if (keywordExclusion.isExcluded) {
          // Override with keyword exclusion
          classification = 'Business'; // Excluded items are typically businesses
          confidence = keywordExclusion.confidence;
          reasoning = keywordExclusion.reasoning;
          processingTier = 'Excluded';
        } else if (rawResult?.status === 'success') {
          // Use OpenAI result
          classification = rawResult.classification || 'Individual';
          confidence = rawResult.confidence || 0;
          reasoning = rawResult.reasoning || 'AI classification';
          processingTier = 'AI-Powered';
        }
        
        return createPayeeClassification(name, {
          classification,
          confidence,
          reasoning,
          processingTier,
          keywordExclusion,
          processingMethod: keywordExclusion.isExcluded ? 'Keyword Exclusion' : 'OpenAI Batch API'
        }, originalRowData, originalRowIndex);
      });

      const successCount = classifications.filter(c => 
        c.result.processingTier !== 'Failed'
      ).length;
      const failureCount = classifications.length - successCount;

      console.log(`[BATCH MANAGER] Creating summary with original file data:`, {
        classificationsLength: classifications.length,
        originalFileDataLength: originalFileData.length,
        hasOriginalData: originalFileData.length > 0,
        sampleClassification: classifications[0]
      });

      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount,
        originalFileData
      };

      onJobComplete(classifications, summary, job.id);

      // Enhanced validation warning
      const alignmentIssues = classifications.filter(c => 
        originalFileData[c.rowIndex || 0] && 
        originalFileData[c.rowIndex || 0]['Payee'] !== c.payeeName &&
        originalFileData[c.rowIndex || 0]['Supplier'] !== c.payeeName &&
        originalFileData[c.rowIndex || 0]['Name'] !== c.payeeName
      );

      toast({
        title: "Results Downloaded Successfully",
        description: `Downloaded ${successCount} successful classifications${failureCount > 0 ? ` and ${failureCount} failed attempts` : ''} with original file data and keyword exclusions.${alignmentIssues.length > 0 ? ` Detected ${alignmentIssues.length} potential alignment issues - check the Data_Alignment_Status column in the export.` : ''}`,
      });
    } catch (error) {
      const appError = handleError(error, 'Results Download');
      console.error(`[BATCH MANAGER] Error downloading results for job ${job.id}:`, error);
      
      showRetryableErrorToast(
        appError, 
        () => handleDownloadResults(job),
        'Results Download'
      );
    } finally {
      setDownloadingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      console.log(`[BATCH MANAGER] Cancelling job ${jobId}`);
      const cancelledJob = await cancelBatchJob(jobId);
      onJobUpdate(cancelledJob);
      
      toast({
        title: "Job Cancelled",
        description: `Batch job ${jobId.slice(-8)} has been cancelled successfully.`,
      });
    } catch (error) {
      const appError = handleError(error, 'Job Cancellation');
      console.error(`[BATCH MANAGER] Error cancelling job ${jobId}:`, error);
      showErrorToast(appError, 'Job Cancellation');
    }
  };

  const showCancelConfirmation = (jobId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Batch Job',
      description: `Are you sure you want to cancel job ${jobId.slice(-8)}? This action cannot be undone and you may be charged for completed requests.`,
      onConfirm: () => handleCancelJob(jobId),
      variant: 'destructive'
    });
  };

  const showDeleteConfirmation = (jobId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Job',
      description: `Are you sure you want to remove job ${jobId.slice(-8)} from the list? This will only remove it from your view, not delete the actual job.`,
      onConfirm: () => onJobDelete(jobId),
      variant: 'destructive'
    });
  };

  // Sort jobs by creation date in descending order (most recent first)
  const sortedJobs = [...jobs].sort((a, b) => b.created_at - a.created_at);

  if (jobs.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No batch jobs found. Submit a batch for processing to see jobs here.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Batch Jobs</h3>
        
        {sortedJobs.map((job) => {
          const pollingState = pollingStates[job.id];
          const isJobRefreshing = refreshingJobs.has(job.id);
          const isJobDownloading = downloadingJobs.has(job.id);
          const payeeCount = payeeNamesMap[job.id]?.length || 0;
          
          return (
            <BatchJobCard
              key={job.id}
              job={job}
              pollingState={pollingState}
              payeeCount={payeeCount}
              isRefreshing={isJobRefreshing}
              isDownloading={isJobDownloading}
              onManualRefresh={handleManualRefresh}
              onDownloadResults={handleDownloadResults}
              onCancelJob={showCancelConfirmation}
              onDeleteJob={showDeleteConfirmation}
            />
          );
        })}
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === 'destructive' ? 'Delete' : 'Continue'}
      />
    </>
  );
};

export default BatchJobManager;
