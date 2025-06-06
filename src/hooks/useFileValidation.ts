
import { useState } from "react";
import { parseUploadedFile } from "@/lib/fileValidation";
import { validateFile, validatePayeeData } from "@/lib/fileValidation";
import { handleError, showErrorToast } from "@/lib/errorHandler";
import { useToast } from "@/components/ui/use-toast";

export const useFileValidation = () => {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [validationStatus, setValidationStatus] = useState<'none' | 'validating' | 'valid' | 'error'>('none');
  const [fileInfo, setFileInfo] = useState<{ rowCount?: number; payeeCount?: number } | null>(null);
  const [originalFileData, setOriginalFileData] = useState<any[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetValidation = () => {
    setFile(null);
    setColumns([]);
    setSelectedColumn("");
    setFileError(null);
    setValidationStatus('none');
    setFileInfo(null);
    setOriginalFileData([]);
  };

  const validateFileUpload = async (selectedFile: File) => {
    setFileError(null);
    setColumns([]);
    setSelectedColumn("");
    setValidationStatus('none');
    setFileInfo(null);
    setOriginalFileData([]);
    
    setValidationStatus('validating');

    try {
      // Validate file first
      const fileValidation = validateFile(selectedFile);
      if (!fileValidation.isValid) {
        const appError = handleError(fileValidation.error!, 'File Validation');
        setFileError(appError.message);
        setValidationStatus('error');
        setFile(null);
        showErrorToast(appError, 'File Validation');
        return { success: false };
      }

      setFile(selectedFile);
      
      // Parse headers only to get column names
      const headers = await parseUploadedFile(selectedFile, true);
      if (!headers || headers.length === 0) {
        throw new Error('No columns found in the file');
      }

      setColumns(headers);
      
      // Also parse the full file data to store for later use
      const fullData = await parseUploadedFile(selectedFile, false);
      setOriginalFileData(fullData);
      
      console.log(`[FILE VALIDATION] Stored ${fullData.length} rows of original data with ${headers.length} columns`);
      
      // Auto-select column if it contains "payee" or "name"
      const payeeColumn = headers.find(
        col => col.toLowerCase().includes('payee') || col.toLowerCase().includes('name')
      );
      
      if (payeeColumn) {
        setSelectedColumn(payeeColumn);
      }

      setValidationStatus('valid');
      
      toast({
        title: "File Uploaded Successfully",
        description: `Found ${headers.length} columns and ${fullData.length} rows. ${payeeColumn ? `Auto-selected "${payeeColumn}" column.` : 'Please select the payee name column.'}`,
      });

      return { success: true, headers, fullData };
    } catch (error) {
      const appError = handleError(error, 'File Upload');
      console.error("Error parsing file:", error);
      setFileError(appError.message);
      setValidationStatus('error');
      setFile(null);
      showErrorToast(appError, 'File Parsing');
      return { success: false };
    }
  };

  const validateSelectedData = async () => {
    if (!file || !selectedColumn || originalFileData.length === 0) return null;

    try {
      setValidationStatus('validating');
      
      // Validate payee data using the stored original data
      const dataValidation = validatePayeeData(originalFileData, selectedColumn);
      if (!dataValidation.isValid) {
        const appError = handleError(dataValidation.error!, 'Data Validation');
        setValidationStatus('error');
        showErrorToast(appError, 'Data Validation');
        return null;
      }

      // Extract payee names WITHOUT filtering to maintain 1:1 correspondence
      const payeeNames = originalFileData.map(row => {
        const name = row[selectedColumn];
        return String(name || '').trim() || '[Empty]';
      });
      
      console.log(`[FILE VALIDATION] Maintaining exact 1:1 correspondence: ${originalFileData.length} rows = ${payeeNames.length} payees`);
      
      setFileInfo({
        rowCount: originalFileData.length,
        payeeCount: payeeNames.length
      });

      setValidationStatus('valid');
      return payeeNames;
    } catch (error) {
      const appError = handleError(error, 'Data Validation');
      setValidationStatus('error');
      showErrorToast(appError, 'Data Validation');
      return null;
    }
  };

  return {
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
  };
};
