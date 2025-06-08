
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { FileText, AlertCircle } from "lucide-react";
import BatchJobManager from "./BatchJobManager";
import BatchResultsDisplay from "./BatchResultsDisplay";
import FileUploadForm from "./FileUploadForm";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { isOpenAIInitialized, testOpenAIConnection } from "@/lib/openai/client";
import { cleanProcessBatch } from "@/lib/classification/cleanBatchProcessor";
import { exportResultsFixed } from "@/lib/classification/fixedExporter";
import { usePersistentBatchJobs } from "@/hooks/usePersistentBatchJobs";

interface BatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onComplete }: BatchClassificationFormProps) => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Use the new persistent storage hook
  const {
    batchJobs,
    isLoading: jobsLoading,
    addJob,
    updateJob,
    deleteJob
  } = usePersistentBatchJobs();

  // Check API key validity on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      console.log('[BATCH FORM] Checking API key validity...');
      setIsCheckingApiKey(true);
      
      try {
        if (isOpenAIInitialized()) {
          const isWorking = await testOpenAIConnection();
          console.log('[BATCH FORM] API key test result:', isWorking);
          setIsApiKeyValid(isWorking);
          
          if (!isWorking) {
            toast({
              title: "API Key Issue",
              description: "OpenAI API key test failed. Please check your API key in settings.",
              variant: "destructive"
            });
          }
        } else {
          console.log('[BATCH FORM] OpenAI not initialized');
          setIsApiKeyValid(false);
        }
      } catch (error) {
        console.error('[BATCH FORM] Error checking API key:', error);
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

  const handleDirectProcessing = async (originalFileData: any[], selectedColumn: string) => {
    console.log(`[BATCH FORM] Starting clean processing of ${originalFileData.length} rows using column: ${selectedColumn}`);
    setIsProcessing(true);
    
    try {
      const result = await cleanProcessBatch(originalFileData, selectedColumn, {
        aiThreshold: 75,
        bypassRuleNLP: false,
        useEnhanced: true,
        offlineMode: false
      });
      
      setBatchResults(result.results);
      setProcessingSummary(result);
      onComplete(result.results, result);
      
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${result.results.length} payees using the selected column "${selectedColumn}".`,
      });
      
    } catch (error) {
      console.error('[BATCH FORM] Clean processing failed:', error);
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
    console.log(`[BATCH FORM] Batch job created with ${payeeNames.length} payees and ${originalFileData.length} original data rows`);
    
    if (!isApiKeyValid) {
      console.error('[BATCH FORM] API key not valid, cannot create batch job');
      toast({
        title: "API Key Required",
        description: "Please set a valid OpenAI API key before creating batch jobs.",
        variant: "destructive"
      });
      return;
    }
    
    await addJob(batchJob, payeeNames, originalFileData);
    
    toast({
      title: "Batch Job Created",
      description: `Created batch job ${batchJob.id.slice(-8)} with ${payeeNames.length} payees. Jobs are now persistent!`,
    });
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[BATCH FORM] Job ${jobId} completed with ${results.length} results`);
    setBatchResults(results);
    setProcessingSummary(summary);
    onComplete(results, summary);
  };

  const handleReset = () => {
    setBatchResults([]);
    setProcessingSummary(null);
  };

  if (isCheckingApiKey || jobsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">
                {isCheckingApiKey ? "Verifying API connection..." : "Loading batch jobs..."}
              </p>
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
                A valid OpenAI API key is required for batch processing. Please set your API key in the Settings tab first.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Upload a CSV or Excel file to classify payees. Jobs are now permanently stored and will persist across browser refreshes and device changes.
        </AlertDescription>
      </Alert>

      <FileUploadForm 
        onBatchJobCreated={handleBatchJobCreated}
        onDirectProcessing={handleDirectProcessing}
        isProcessing={isProcessing}
      />

      {batchJobs.length > 0 && (
        <BatchJobManager
          jobs={batchJobs}
          onJobUpdate={updateJob}
          onJobComplete={handleJobComplete}
          onJobDelete={deleteJob}
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

export default BatchClassificationForm;
