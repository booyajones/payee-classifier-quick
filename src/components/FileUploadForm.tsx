
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useFileValidation } from "@/hooks/useFileValidation";
import { useToast } from "@/components/ui/use-toast";
import FileUploadHeader from "./file-upload/FileUploadHeader";
import FileUploadInput from "./file-upload/FileUploadInput";
import ValidationErrorDisplay from "./file-upload/ValidationErrorDisplay";
import ColumnSelector from "./file-upload/ColumnSelector";
import FileUploadActions from "./file-upload/FileUploadActions";

interface FileUploadFormProps {
  onDirectProcessing: (originalFileData: any[], selectedColumn: string) => Promise<void>;
  isProcessing?: boolean;
}

const FileUploadForm = ({ onDirectProcessing, isProcessing = false }: FileUploadFormProps) => {
  const { toast } = useToast();

  const {
    file,
    columns,
    selectedColumn,
    setSelectedColumn,
    validationStatus,
    fileInfo,
    fileError,
    validationResult,
    validateFile,
    reset: resetValidation
  } = useFileValidation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      await validateFile(selectedFile);
      
      // Auto-select column if payeeColumnName was detected
      if (validationResult?.payeeColumnName) {
        setSelectedColumn(validationResult.payeeColumnName);
      }
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
    if (!validationResult || !selectedColumn) {
      toast({
        title: "Validation Error",
        description: "Please select a valid column to process",
        variant: "destructive",
      });
      return;
    }

    console.log(`[FILE UPLOAD] Starting processing with column: ${selectedColumn}`);
    await onDirectProcessing(validationResult.originalData, selectedColumn);
  };

  const handleReset = () => {
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
    !validationResult?.originalData?.length ||
    isProcessing;

  const getProcessButtonText = () => {
    return isProcessing ? "Processing..." : "Process File";
  };

  return (
    <Card>
      <FileUploadHeader />
      <CardContent className="space-y-4">
        <FileUploadInput
          file={file}
          validationStatus={validationStatus}
          onFileChange={handleFileChange}
        />

        <ValidationErrorDisplay fileError={fileError} />

        <ColumnSelector
          columns={columns}
          selectedColumn={selectedColumn}
          onColumnChange={setSelectedColumn}
          fileInfo={fileInfo}
        />

        <FileUploadActions
          isLoading={isProcessing}
          isRetrying={false}
          retryCount={0}
          isProcessButtonDisabled={isProcessButtonDisabled}
          onProcess={handleSubmit}
          onReset={handleReset}
          buttonText={getProcessButtonText()}
        />
      </CardContent>
    </Card>
  );
};

export default FileUploadForm;
