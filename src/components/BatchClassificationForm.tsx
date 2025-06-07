
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Zap, AlertCircle } from "lucide-react";
import BatchJobManager from "./BatchJobManager";
import BatchResultsDisplay from "./BatchResultsDisplay";
import FileUploadForm from "./FileUploadForm";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { handleError, showErrorToast } from "@/lib/errorHandler";
import { 
  loadBatchJobs, 
  addBatchJob, 
  updateBatchJob, 
  removeBatchJob, 
  cleanupBatchJobs,
  StoredBatchJob 
} from "@/lib/storage/batchJobStorage";

interface BatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onComplete }: BatchClassificationFormProps) => {
  const [batchJobs, setBatchJobs] = useState<StoredBatchJob[]>([]);
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const { toast } = useToast();

  // Load persisted jobs on component mount
  useEffect(() => {
    const storedJobs = loadBatchJobs();
    cleanupBatchJobs(); // Clean up old/invalid jobs
    setBatchJobs(storedJobs);
    
    if (storedJobs.length > 0) {
      console.log(`[BATCH FORM] Loaded ${storedJobs.length} persisted batch jobs`);
    }
  }, []);

  const handleBatchJobCreated = (batchJob: BatchJob, payeeNames: string[], originalFileData: any[]) => {
    console.log(`[BATCH FORM] Batch job created with ${payeeNames.length} payees and ${originalFileData.length} original data rows`);
    
    // Add to localStorage
    addBatchJob(batchJob, payeeNames, originalFileData);
    
    // Create stored job for state
    const storedJob: StoredBatchJob = {
      ...batchJob,
      payeeNames,
      originalFileData,
      createdAt: Date.now()
    };
    
    // Add to state
    setBatchJobs(prev => [storedJob, ...prev]);
    
    toast({
      title: "Batch Job Created",
      description: `Created batch job ${batchJob.id.slice(-8)} with ${payeeNames.length} payees. Job persisted and will survive page refreshes.`,
    });
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[BATCH FORM] Job ${jobId} completed with ${results.length} results`);
    setBatchResults(results);
    setProcessingSummary(summary);
    onComplete(results, summary);
  };

  const handleJobUpdate = (updatedJob: BatchJob) => {
    // Update in localStorage
    updateBatchJob(updatedJob);
    
    // Update in state
    setBatchJobs(prev => prev.map(job => 
      job.id === updatedJob.id ? { ...job, ...updatedJob } : job
    ));
  };

  const handleJobDelete = (jobId: string) => {
    // Remove from localStorage
    removeBatchJob(jobId);
    
    // Remove from state
    setBatchJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const handleReset = () => {
    setBatchResults([]);
    setProcessingSummary(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            OpenAI Batch Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload a file to create an OpenAI batch job. Jobs are automatically saved and will persist across page refreshes. Processing typically takes 10-15 minutes but can take up to 24 hours.
            </AlertDescription>
          </Alert>

          <FileUploadForm onBatchJobCreated={handleBatchJobCreated} />
        </CardContent>
      </Card>

      {batchJobs.length > 0 && (
        <BatchJobManager
          jobs={batchJobs}
          onJobUpdate={handleJobUpdate}
          onJobComplete={handleJobComplete}
          onJobDelete={handleJobDelete}
        />
      )}

      <BatchResultsDisplay
        batchResults={batchResults}
        processingSummary={processingSummary}
        onReset={handleReset}
        isProcessing={false}
      />
    </div>
  );
};

export default BatchClassificationForm;
