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
import { isOpenAIInitialized, testOpenAIConnection } from "@/lib/openai/client";
import { fixedProcessBatch } from "@/lib/classification/fixedBatchProcessor";
import { exportResultsFixed } from "@/lib/classification/fixedExporter";
import { 
  loadBatchJobs, 
  addBatchJob, 
  updateBatchJob, 
  removeBatchJob, 
  cleanupBatchJobs,
  StoredBatchJob 
} from "@/lib/storage/batchJobStorage";

interface FixedBatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const FixedBatchClassificationForm = ({ onComplete }: FixedBatchClassificationFormProps) => {
  const [batchJobs, setBatchJobs] = useState<StoredBatchJob[]>([]);
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Check API key validity on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      console.log('[FIXED BATCH FORM] Checking API key validity...');
      setIsCheckingApiKey(true);
      
      try {
        if (isOpenAIInitialized()) {
          const isWorking = await testOpenAIConnection();
          console.log('[FIXED BATCH FORM] API key test result:', isWorking);
          setIsApiKeyValid(isWorking);
          
          if (!isWorking) {
            toast({
              title: "API Key Issue",
              description: "OpenAI API key test failed. Please check your API key in diagnostics.",
              variant: "destructive"
            });
          }
        } else {
          console.log('[FIXED BATCH FORM] OpenAI not initialized');
          setIsApiKeyValid(false);
        }
      } catch (error) {
        console.error('[FIXED BATCH FORM] Error checking API key:', error);
        setIsApiKeyValid(false);
        toast({
          title: "API Connection Error",
          description: "Failed to verify OpenAI API connection. Please check your API key.",
          variant: "destructive"
        });
      } finally {
        setIsCheckingApiKey(false);
      }
    };

    checkApiKey();
  }, [toast]);

  // Load persisted jobs on component mount
  useEffect(() => {
    const storedJobs = loadBatchJobs();
    cleanupBatchJobs();
    setBatchJobs(storedJobs);
    
    if (storedJobs.length > 0) {
      console.log(`[FIXED BATCH FORM] Loaded ${storedJobs.length} persisted batch jobs`);
    }
  }, []);

  const handleDirectProcessing = async (payeeNames: string[], originalFileData: any[]) => {
    console.log(`[FIXED BATCH FORM] Starting direct processing of ${payeeNames.length} payees`);
    setIsProcessing(true);
    
    try {
      const result = await fixedProcessBatch(payeeNames, {
        aiThreshold: 75,
        bypassRuleNLP: false,
        useEnhanced: true,
        offlineMode: false
      }, originalFileData);
      
      setBatchResults(result.results);
      setProcessingSummary(result);
      onComplete(result.results, result);
      
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${result.results.length} payees with improved classification.`,
      });
      
    } catch (error) {
      console.error('[FIXED BATCH FORM] Direct processing failed:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchJobCreated = async (batchJob: BatchJob, payeeNames: string[], originalFileData: any[]) => {
    console.log(`[FIXED BATCH FORM] Real batch job created with ${payeeNames.length} payees and ${originalFileData.length} original data rows`);
    
    if (!isApiKeyValid) {
      console.error('[FIXED BATCH FORM] API key not valid, cannot create batch job');
      toast({
        title: "API Key Required",
        description: "Please set a valid OpenAI API key before creating batch jobs.",
        variant: "destructive"
      });
      return;
    }
    
    addBatchJob(batchJob, payeeNames, originalFileData, false);
    
    const storedJob: StoredBatchJob = {
      ...batchJob,
      payeeNames,
      originalFileData,
      createdAt: Date.now(),
      isMockJob: false
    };
    
    setBatchJobs(prev => [storedJob, ...prev]);
    
    toast({
      title: "Batch Job Created",
      description: `Created batch job ${batchJob.id.slice(-8)} with ${payeeNames.length} payees.`,
    });
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[FIXED BATCH FORM] Job ${jobId} completed with ${results.length} results`);
    setBatchResults(results);
    setProcessingSummary(summary);
    onComplete(results, summary);
  };

  const handleJobUpdate = (updatedJob: BatchJob) => {
    updateBatchJob(updatedJob);
    setBatchJobs(prev => prev.map(job => 
      job.id === updatedJob.id ? { ...job, ...updatedJob } : job
    ));
  };

  const handleJobDelete = (jobId: string) => {
    removeBatchJob(jobId);
    setBatchJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const handleReset = () => {
    setBatchResults([]);
    setProcessingSummary(null);
  };

  if (isCheckingApiKey) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">Verifying API connection...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isApiKeyValid) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              API Key Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A valid OpenAI API key is required to use batch processing. Please set your API key in the Diagnostics tab first.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Fixed Batch Processing (No Duplicates)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This improved version fixes classification bias, eliminates duplicates, and ensures perfect data alignment.
            </AlertDescription>
          </Alert>

          <FileUploadForm 
            onBatchJobCreated={handleBatchJobCreated}
            onDirectProcessing={handleDirectProcessing}
            isProcessing={isProcessing}
          />
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
        isProcessing={isProcessing}
        exportFunction={exportResultsFixed}
      />
    </div>
  );
};

export default FixedBatchClassificationForm;
