
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useFileValidation } from "@/hooks/useFileValidation";
import { AppError } from "@/lib/fileValidation/types";
import FileUploadInput from "./file-upload/FileUploadInput";
import ColumnSelector from "./file-upload/ColumnSelector";
import FileUploadActions from "./file-upload/FileUploadActions";

interface FileUploadFormProps {
  onSubmit: (payeeNames: string[], originalData: any[], selectedColumn: string) => void;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
}

const FileUploadForm = ({ onSubmit, isLoading, isRetrying, retryCount }: FileUploadFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedColumn, setSelectedColumn] = useState("");
  const { toast } = useToast();

  const {
    validationStatus,
    validationResult,
    validateFile,
    reset: resetValidation
  } = useFileValidation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setSelectedColumn("");
    
    try {
      await validateFile(selectedFile);
    } catch (error) {
      console.error('File validation error:', error);
      toast({
        title: "File Validation Error",
        description: error instanceof Error ? error.message : "Failed to validate file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!file || !validationResult || !selectedColumn) {
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

    try {
      console.log('[FileUploadForm] Submitting with perfect row correspondence:', {
        payeeCount: validationResult.payeeNames.length,
        originalDataCount: validationResult.originalData?.length || 0,
        selectedColumn,
        perfectAlignment: validationResult.payeeNames.length === (validationResult.originalData?.length || 0)
      });

      await onSubmit(
        validationResult.payeeNames,
        validationResult.originalData || [],
        selectedColumn
      );
    } catch (error) {
      console.error('Submit error:', error);
      const appError: AppError = {
        ...error as Error,
        code: 'SUBMIT_ERROR'
      };
      toast({
        title: "Submission Error",
        description: appError.message || "Failed to submit file for processing",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setSelectedColumn("");
    resetValidation();
    
    // Clear the file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const isProcessButtonDisabled = 
    !file || 
    validationStatus === 'validating' || 
    validationStatus === 'error' || 
    !selectedColumn || 
    !validationResult?.payeeNames?.length ||
    isLoading;

  const columns = validationResult?.originalData?.[0] 
    ? Object.keys(validationResult.originalData[0]) 
    : [];

  const fileInfo = validationResult ? {
    rowCount: validationResult.originalData?.length || 0,
    payeeCount: validationResult.payeeNames?.length || 0
  } : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File for Batch Processing</CardTitle>
        <CardDescription>
          Upload an Excel or CSV file containing payee names for AI-powered classification with perfect data alignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUploadInput
          file={file}
          validationStatus={validationStatus}
          onFileChange={handleFileChange}
        />

        {validationStatus === 'error' && validationResult?.error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">Validation Error</p>
            <p className="text-sm text-destructive/80 mt-1">
              {validationResult.error.message}
            </p>
          </div>
        )}

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
          onProcess={handleSubmit}
          onReset={handleReset}
        />
      </CardContent>
    </Card>
  );
};

export default FileUploadForm;
