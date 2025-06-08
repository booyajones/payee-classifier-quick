
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";
import BatchJobManager from "./BatchJobManager";
import BatchResultsDisplay from "./BatchResultsDisplay";
import FileUploadForm from "./FileUploadForm";
import APIKeyInput from "./APIKeyInput";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { isOpenAIInitialized, testOpenAIConnection } from "@/lib/openai/client";
import { cleanProcessBatch } from "@/lib/classification/cleanBatchProcessor";
import { exportResultsFixed } from "@/lib/classification/fixedExporter";
import { usePersistentBatchJobs } from "@/hooks/usePersistentBatchJobs";

interface BatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onApiKeySet?: () => void;
  onApiKeyChange?: () => void;
}

const BatchClassificationForm = ({ onComplete, onApiKeySet, onApiKeyChange }: BatchClassificationFormProps) => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const {
    batchJobs,
    isLoading: jobsLoading,
    addJob,
    updateJob,
    deleteJob
  } = usePersistentBatchJobs();

  useEffect(() => {
    const checkApiKey = async () => {
      setIsCheckingApiKey(true);
      
      try {
        if (isOpenAIInitialized()) {
          const isWorking = await testOpenAIConnection();
          setIsApiKeyValid(isWorking);
          
          if (!isWorking) {
            toast({
              title: "API Key Issue",
              description: "OpenAI API key test failed. Please check your API key.",
              variant: "destructive"
            });
          }
        } else {
          setIsApiKeyValid(false);
        }
      } catch (error) {
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
        description: `Successfully processed ${result.results.length} payees.`,
      });
      
    } catch (error) {
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
    if (!isApiKeyValid) {
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
      description: `Created batch job with ${payeeNames.length} payees.`,
    });
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    setBatchResults(results);
    setProcessingSummary(summary);
    onComplete(results, summary);
  };

  const handleReset = () => {
    setBatchResults([]);
    setProcessingSummary(null);
  };

  const handleApiKeySetLocal = () => {
    setIsApiKeyValid(true);
    onApiKeySet?.();
  };

  const handleApiKeyChangeLocal = () => {
    setIsApiKeyValid(isOpenAIInitialized());
    onApiKeyChange?.();
  };

  if (isCheckingApiKey || jobsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {isCheckingApiKey ? "Verifying API connection..." : "Loading..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isApiKeyValid) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <APIKeyInput 
              onApiKeySet={handleApiKeySetLocal}
              onApiKeyChange={handleApiKeyChangeLocal} 
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
