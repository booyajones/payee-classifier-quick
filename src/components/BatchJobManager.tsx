
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, Clock, Download, RefreshCw, Trash } from "lucide-react";
import { BatchJob, checkBatchJobStatus, getBatchJobResults, cancelBatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { createPayeeClassification } from "@/lib/utils";
import { useBatchJobPolling } from "@/hooks/useBatchJobPolling";

interface BatchJobManagerProps {
  jobs: BatchJob[];
  payeeNamesMap: Record<string, string[]>;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

const BatchJobManager = ({ 
  jobs, 
  payeeNamesMap, 
  onJobUpdate, 
  onJobComplete, 
  onJobDelete 
}: BatchJobManagerProps) => {
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Use the centralized polling hook
  const { pollingStates } = useBatchJobPolling(jobs, onJobUpdate);

  const handleRefreshJob = async (jobId: string) => {
    setRefreshingJobs(prev => new Set(prev).add(jobId));
    try {
      console.log(`[BATCH MANAGER] Refreshing job ${jobId}`);
      const updatedJob = await checkBatchJobStatus(jobId);
      onJobUpdate(updatedJob);
      
      toast({
        title: "Job Status Updated",
        description: `Job ${jobId.slice(-8)} status refreshed.`,
      });
    } catch (error) {
      console.error(`[BATCH MANAGER] Error refreshing job ${jobId}:`, error);
      toast({
        title: "Refresh Failed",
        description: `Failed to refresh job ${jobId.slice(-8)}.`,
        variant: "destructive",
      });
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
      
      if (payeeNames.length === 0) {
        toast({
          title: "Download Failed",
          description: "No payee names found for this job.",
          variant: "destructive",
        });
        return;
      }

      const results = await getBatchJobResults(job, payeeNames);
      
      const classifications = payeeNames.map((name, index) => {
        const result = results[index];
        return createPayeeClassification(name, {
          classification: result?.classification || 'Individual',
          confidence: result?.confidence || 0,
          reasoning: result?.reasoning || 'No result available',
          processingTier: result?.status === 'success' ? 'AI-Powered' : 'Failed'
        });
      });

      const successCount = results.filter(r => r.status === 'success').length;
      const failureCount = results.length - successCount;

      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount
      };

      onJobComplete(classifications, summary, job.id);

      toast({
        title: "Results Downloaded",
        description: `Successfully downloaded ${successCount} classifications.`,
      });
    } catch (error) {
      console.error(`[BATCH MANAGER] Error downloading results for job ${job.id}:`, error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download results.",
        variant: "destructive",
      });
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
        description: `Batch job ${jobId.slice(-8)} has been cancelled.`,
      });
    } catch (error) {
      console.error(`[BATCH MANAGER] Error cancelling job ${jobId}:`, error);
      toast({
        title: "Cancellation Failed",
        description: `Failed to cancel job ${jobId.slice(-8)}.`,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'expired':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'expired':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

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
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Batch Jobs</h3>
      
      {jobs.map((job) => {
        const pollingState = pollingStates[job.id];
        
        return (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">
                    Job {job.id.slice(-8)}
                    {pollingState?.isPolling && (
                      <span className="ml-2 text-xs text-blue-600">
                        (Polling #{pollingState.pollCount})
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {job.metadata?.description || 'Payee classification batch'}
                  </CardDescription>
                  {pollingState?.lastError && (
                    <p className="text-xs text-red-600 mt-1">
                      Last error: {pollingState.lastError}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <Badge className={getStatusColor(job.status)}>
                    {job.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Requests:</span> {job.request_counts.total}
                </div>
                <div>
                  <span className="font-medium">Completed:</span> {job.request_counts.completed}
                </div>
                <div>
                  <span className="font-medium">Failed:</span> {job.request_counts.failed}
                </div>
                <div>
                  <span className="font-medium">Progress:</span>{' '}
                  {Math.round((job.request_counts.completed / job.request_counts.total) * 100)}%
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRefreshJob(job.id)}
                  disabled={refreshingJobs.has(job.id)}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${refreshingJobs.has(job.id) ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                {job.status === 'completed' && (
                  <Button
                    size="sm"
                    onClick={() => handleDownloadResults(job)}
                    disabled={downloadingJobs.has(job.id)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {downloadingJobs.has(job.id) ? 'Downloading...' : 'Download Results'}
                  </Button>
                )}

                {['validating', 'in_progress'].includes(job.status) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleCancelJob(job.id)}
                  >
                    Cancel Job
                  </Button>
                )}

                {['completed', 'failed', 'expired', 'cancelled'].includes(job.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onJobDelete(job.id)}
                  >
                    <Trash className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
    case 'expired':
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'failed':
    case 'expired':
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

export default BatchJobManager;
