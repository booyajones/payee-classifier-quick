import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Zap, AlertCircle, Loader2 } from "lucide-react";
import FileUploadForm from "./FileUploadForm";
import BatchTextInput from "./BatchTextInput";
import BatchJobManager from "./BatchJobManager";
import BatchResultsDisplay from "./BatchResultsDisplay";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { createBatchJob, BatchJob } from "@/lib/openai/trueBatchAPI";
import { handleError, showErrorToast } from "@/lib/errorHandler";
import { parseUploadedFile, validateFileContents } from "@/lib/fileValidation";

interface BatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onComplete }: BatchClassificationFormProps) => {
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeNamesMap, setPayeeNamesMap] = useState<Record<string, string[]>>({});
  const [originalFileDataMap, setOriginalFileDataMap] = useState<Record<string, any[]>>({}); // Add this state
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      console.log('[BATCH FORM] Processing uploaded file:', file.name);
      
      const fileData = await parseUploadedFile(file);
      const { payeeNames, originalData } = validateFileContents(fileData);
      
      if (payeeNames.length === 0) {
        throw new Error('No valid payee names found in the uploaded file.');
      }

      console.log(`[BATCH FORM] Found ${payeeNames.length} payee names, creating batch job...`);
      
      const batchJob = await createBatchJob(
        payeeNames,
        `File: ${file.name} - ${payeeNames.length} payees`
      );
      
      // Store both payee names and original file data
      setPayeeNamesMap(prev => ({
        ...prev,
        [batchJob.id]: payeeNames
      }));
      
      setOriginalFileDataMap(prev => ({
        ...prev,
        [batchJob.id]: originalData // Store original file data
      }));
      
      setBatchJobs(prev => [batchJob, ...prev]);
      
      toast({
        title: "Batch Job Created",
        description: `Created batch job ${batchJob.id.slice(-8)} with ${payeeNames.length} payees. Use "Check Status" to monitor progress.`,
      });
      
    } catch (error) {
      const appError = handleError(error, 'File Upload');
      console.error('[BATCH FORM] File upload error:', error);
      showErrorToast(appError, 'File Upload');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTextSubmit = async (payeeNames: string[]) => {
    try {
      setIsProcessing(true);
      console.log(`[BATCH FORM] Processing ${payeeNames.length} payee names from text input...`);
      
      const batchJob = await createBatchJob(
        payeeNames,
        `Text input - ${payeeNames.length} payees`
      );
      
      // Store payee names (no original file data for text input)
      setPayeeNamesMap(prev => ({
        ...prev,
        [batchJob.id]: payeeNames
      }));
      
      // Create minimal original data structure for text input
      const textOriginalData = payeeNames.map((name, index) => ({
        'Payee_Name': name,
        'Row_Number': index + 1
      }));
      
      setOriginalFileDataMap(prev => ({
        ...prev,
        [batchJob.id]: textOriginalData
      }));
      
      setBatchJobs(prev => [batchJob, ...prev]);
      
      toast({
        title: "Batch Job Created",
        description: `Created batch job ${batchJob.id.slice(-8)} with ${payeeNames.length} payees. Use "Check Status" to monitor progress.`,
      });
      
    } catch (error) {
      const appError = handleError(error, 'Text Submission');
      console.error('[BATCH FORM] Text submission error:', error);
      showErrorToast(appError, 'Text Submission');
    } finally {
      setIsProcessing(false);
    }
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
              Upload a file or enter payee names to create an OpenAI batch job. Processing typically takes 10-15 minutes but can take up to 24 hours. Results will include original file data and keyword exclusions.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File for Batch Processing
                </CardTitle>
                <CardDescription>
                  Upload CSV/Excel file to create a batch job
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={isProcessing}
                  className="w-full"
                />
                {isProcessing && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Processing file...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Text Input for Batch Processing
                </CardTitle>
                <CardDescription>
                  Enter payee names (one per line) to create a batch job
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const text = formData.get('payeeNames') as string;
                  const names = text.split('\n').map(name => name.trim()).filter(name => name.length > 0);
                  if (names.length > 0) handleTextSubmit(names);
                }}>
                  <textarea
                    name="payeeNames"
                    placeholder="Enter payee names (one per line)"
                    className="w-full min-h-[100px] p-2 border rounded"
                    disabled={isProcessing}
                  />
                  <Button type="submit" disabled={isProcessing} className="mt-2 w-full">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Job...
                      </>
                    ) : (
                      'Submit for Processing'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
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
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default BatchClassificationForm;
