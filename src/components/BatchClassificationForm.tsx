
import { useState, useRef } from "react";
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

interface BatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onComplete }: BatchClassificationFormProps) => {
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeNamesMap, setPayeeNamesMap] = useState<Record<string, string[]>>({});
  const [originalFileDataMap, setOriginalFileDataMap] = useState<Record<string, any[]>>({});
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const { toast } = useToast();

  const handleBatchJobCreated = (batchJob: BatchJob, payeeNames: string[]) => {
    console.log(`[BATCH FORM] Batch job created with ${payeeNames.length} payees`);
    
    // Store payee names for this job
    setPayeeNamesMap(prev => ({
      ...prev,
      [batchJob.id]: payeeNames
    }));
    
    // Add to batch jobs list
    setBatchJobs(prev => [batchJob, ...prev]);
    
    toast({
      title: "Batch Job Created",
      description: `Created batch job ${batchJob.id.slice(-8)} with ${payeeNames.length} payees. Use "Check Status" to monitor progress.`,
    });
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[BATCH FORM] Job ${jobId} completed with ${results.length} results`);
    setBatchResults(results);
    setProcessingSummary(summary);
    onComplete(results, summary);
  };

  const handleJobUpdate = (updatedJob: BatchJob) => {
    setBatchJobs(prev => prev.map(job => 
      job.id === updatedJob.id ? updatedJob : job
    ));
  };

  const handleJobDelete = (jobId: string) => {
    setBatchJobs(prev => prev.filter(job => job.id !== jobId));
    setPayeeNamesMap(prev => {
      const { [jobId]: removed, ...rest } = prev;
      return rest;
    });
    setOriginalFileDataMap(prev => {
      const { [jobId]: removed, ...rest } = prev;
      return rest;
    });
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
              Upload a file to create an OpenAI batch job. Processing typically takes 10-15 minutes but can take up to 24 hours. Results will include original file data and keyword exclusions.
            </AlertDescription>
          </Alert>

          <FileUploadForm onBatchJobCreated={handleBatchJobCreated} />
        </CardContent>
      </Card>

      {batchJobs.length > 0 && (
        <BatchJobManager
          jobs={batchJobs}
          payeeNamesMap={payeeNamesMap}
          originalFileDataMap={originalFileDataMap}
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
