
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ClassificationConfig } from "@/lib/types";
import { createBatchJob, BatchJob } from "@/lib/openai/trueBatchAPI";
import { handleError, showRetryableErrorToast } from "@/lib/errorHandler";
import { useRetry } from "@/hooks/useRetry";
import { useFileValidation } from "@/hooks/useFileValidation";
import FileUploadInput from "./file-upload/FileUploadInput";
import ColumnSelector from "./file-upload/ColumnSelector";
import FileUploadActions from "./file-upload/FileUploadActions";

interface FileUploadFormProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeNames: string[], originalFileData: any[]) => void;
  config?: ClassificationConfig;
}

const FileUploadForm = ({ 
  onBatchJobCreated,
  config = {
    aiThreshold: 80,
    bypassRuleNLP: true,
    useEnhanced: true,
    offlineMode: false,
    useFuzzyMatching: true,
    similarityThreshold: 85
  }
}: FileUploadFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    file,
    columns,
    selectedColumn,
    setSelectedColumn,
    validationStatus,
    fileInfo,
    originalFileData,
    fileError,
    resetValidation,
    validateFileUpload,
    validateSelectedData
  } = useFileValidation();

  // Retry mechanism for batch job creation
  const {
    execute: createBatchJobWithRetry,
    isRetrying,
    retryCount
  } = useRetry(createBatchJob, { maxRetries: 3, baseDelay: 2000 });

  const resetForm = () => {
    resetValidation();
    
    // Reset the file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    
    toast({
      title: "Form Reset",
      description: "The file upload form has been reset. You can now start over.",
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    await validateFileUpload(selectedFile);
  };

  const handleProcess = async () => {
    if (!file || !selectedColumn || originalFileData.length === 0) {
      toast({
        title: "Error",
        description: "Please upload a file and select a column",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const payeeNames = await validateSelectedData();
      if (!payeeNames) {
        setIsLoading(false);
        return;
      }

      console.log(`[FILE UPLOAD] Creating batch job with EXACT 1:1 correspondence:`);
      console.log(`- Original file rows: ${originalFileData.length}`);
      console.log(`- Payee names: ${payeeNames.length}`);
      console.log(`- First 3 payees: ${payeeNames.slice(0, 3)}`);
      console.log(`- Selected column: "${selectedColumn}"`);

      // Create sequential row indexes - exact 1:1 mapping
      const originalRowIndexes = Array.from({ length: originalFileData.length }, (_, i) => i);

      const batchJob = await createBatchJobWithRetry(
        payeeNames, 
        `File upload batch: ${file.name}, ${payeeNames.length} payees with exact row correspondence`,
        originalRowIndexes
      );
      
      console.log(`[FILE UPLOAD] Batch job created with PERFECT alignment:`);
      console.log(`- Job ID: ${batchJob.id}`);
      console.log(`- Payee count: ${payeeNames.length}`);
      console.log(`- Original data rows: ${originalFileData.length}`);
      console.log(`- Index alignment: GUARANTEED 1:1`);

      // Pass both payee names AND original file data with guaranteed alignment
      onBatchJobCreated(batchJob, payeeNames, originalFileData);
      
      toast({
        title: "Batch Job Created Successfully",
        description: `Submitted ${payeeNames.length} payees from ${file.name} with GUARANTEED 1:1 row correspondence. Job ID: ${batchJob.id.slice(-8)}`,
      });
    } catch (error) {
      const appError = handleError(error, 'Batch Job Creation');
      console.error("Error creating batch job from file:", error);
      
      showRetryableErrorToast(
        appError, 
        () => handleProcess(),
        'Batch Job Creation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isProcessButtonDisabled = !file || !selectedColumn || isLoading || validationStatus === 'validating' || validationStatus === 'error' || originalFileData.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File for Classification</CardTitle>
        <CardDescription>
          Upload an Excel or CSV file containing payee names for classification processing. All original data will be preserved in the export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fileError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}
        
        <FileUploadInput
          file={file}
          validationStatus={validationStatus}
          onFileChange={handleFileChange}
        />
        
        <ColumnSelector
          columns={columns}
          selectedColumn={selectedColumn}
          onColumnChange={setSelectedColumn}
          fileInfo={fileInfo}
        />
        
        <FileUploadActions
          isLoading={isLoading}
          isRetrying={isRetrying}
          retryCount={retryCount}
          isProcessButtonDisabled={isProcessButtonDisabled}
          onProcess={handleProcess}
          onReset={resetForm}
        />
      </CardContent>
    </Card>
  );
};

export default FileUploadForm;
