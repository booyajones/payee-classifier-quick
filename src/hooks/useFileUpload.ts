
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BatchJob } from "@/lib/openai/trueBatchAPI";

interface UseFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeNames: string[], originalFileData: any[]) => void;
}

export const useFileUpload = ({ onBatchJobCreated }: UseFileUploadProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Generate a valid OpenAI-style batch job ID
  const generateValidBatchJobId = (): string => {
    const timestamp = Date.now().toString();
    const randomSuffix = Math.random().toString(36).substring(2, 15); // 13 random chars
    const id = `batch_mock_${timestamp}_${randomSuffix}`;
    console.log(`[FILE UPLOAD] Generated mock batch job ID: ${id} (length: ${id.length})`);
    return id;
  };

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

      // Create a proper mock BatchJob with valid ID format
      const validBatchJobId = generateValidBatchJobId();
      const mockBatchJob: BatchJob = {
        id: validBatchJobId,
        object: 'batch',
        endpoint: '/v1/chat/completions',
        errors: null,
        input_file_id: `file_mock_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        completion_window: '24h',
        status: 'validating',
        output_file_id: null,
        error_file_id: null,
        created_at: Math.floor(Date.now() / 1000),
        in_progress_at: null,
        expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        finalizing_at: null,
        completed_at: null,
        failed_at: null,
        expired_at: null,
        cancelling_at: null,
        cancelled_at: null,
        request_counts: { 
          total: validationResult.payeeNames.length, 
          completed: 0, 
          failed: 0 
        }
      };

      await onBatchJobCreated(
        mockBatchJob,
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
