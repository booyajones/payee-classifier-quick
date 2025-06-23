import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BatchJob } from "@/lib/types/batchJob";

interface UseFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeNames: string[], originalFileData: any[]) => void;
}

export const useFileUpload = ({ onBatchJobCreated }: UseFileUploadProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const submitFileForProcessing = async (validationResult: any, selectedColumn: string) => {
    if (!validationResult || !selectedColumn) {
      toast({
        title: "Missing Information",
        description: "Please select a file and column before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!validationResult.payeeNames || validationResult.payeeNames.length === 0) {
      toast({
        title: "No Data Found",
        description: "No payee names found in the selected column.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('[FILE UPLOAD] Submitting with perfect row correspondence:', {
        payeeCount: validationResult.payeeNames.length,
        originalDataCount: validationResult.originalData?.length || 0,
        selectedColumn,
        perfectAlignment: validationResult.payeeNames.length === (validationResult.originalData?.length || 0)
      });

      // Import the batch job creation function
      const { createMockBatchJob } = await import("@/lib/types/batchJob");
      
      // Create a mock batch job
      const batchJob = createMockBatchJob(
        validationResult.payeeNames,
        `Payee classification for ${validationResult.payeeNames.length} payees from ${selectedColumn} column`
      );

      await onBatchJobCreated(
        batchJob,
        validationResult.payeeNames,
        validationResult.originalData || []
      );
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Failed to submit file for processing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isRetrying,
    retryCount,
    submitFileForProcessing
  };
};
