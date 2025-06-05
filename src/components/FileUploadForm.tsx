import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseUploadedFile } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, File, Upload, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPayeeClassification } from "@/lib/utils";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { processWithHybridBatch } from "@/lib/openai/hybridBatchProcessor";
import { DEFAULT_CLASSIFICATION_CONFIG } from "@/lib/classification/config";

interface FileUploadFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  config?: ClassificationConfig;
  processingMode?: 'realtime' | 'batch';
}

const FileUploadForm = ({ 
  onComplete, 
  config = {
    ...DEFAULT_CLASSIFICATION_CONFIG,
    useEnhanced: false,
    bypassRuleNLP: true
  },
  processingMode = 'realtime'
}: FileUploadFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const { toast } = useToast();

  const resetForm = () => {
    setFile(null);
    setColumns([]);
    setSelectedColumn("");
    setFileError(null);
    setProgress(0);
    setProcessingStatus("");
    
    // Reset the file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    
    toast({
      title: "Form Reset",
      description: "The file upload form has been reset. You can now start over.",
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setColumns([]);
    setSelectedColumn("");
    
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'xlsx' && fileType !== 'xls' && fileType !== 'csv') {
      setFileError("Please upload an Excel (.xlsx, .xls) or CSV file");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    
    try {
      // Parse headers only to get column names
      const headers = await parseUploadedFile(selectedFile, true);
      setColumns(headers);
      
      // Auto-select column if it contains "payee" or "name"
      const payeeColumn = headers.find(
        col => col.toLowerCase().includes('payee') || col.toLowerCase().includes('name')
      );
      
      if (payeeColumn) {
        setSelectedColumn(payeeColumn);
      }
      
      toast({
        title: "File Uploaded",
        description: `Found ${headers.length} columns. Please select the payee name column.`,
      });
    } catch (error) {
      console.error("Error parsing file:", error);
      setFileError("Error parsing file. Please make sure it's a valid Excel or CSV file.");
      setFile(null);
    }
  };

  const handleProcess = async () => {
    if (!file || !selectedColumn) {
      toast({
        title: "Error",
        description: "Please upload a file and select a column",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setProcessingStatus("");
    
    try {
      // Parse the full file
      const data = await parseUploadedFile(file);
      
      // Extract payee names from the selected column
      const payeeNames = data
        .map(row => row[selectedColumn])
        .filter(name => name && typeof name === 'string' && name.trim() !== '');
      
      if (payeeNames.length === 0) {
        toast({
          title: "No Valid Names Found",
          description: `The selected column "${selectedColumn}" doesn't contain valid payee names.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log(`Processing ${payeeNames.length} names from column "${selectedColumn}" in ${processingMode} mode`);
      setProcessingStatus(`Starting ${processingMode} processing for ${payeeNames.length} payees`);

      const startTime = performance.now();
      const result = await processWithHybridBatch(
        payeeNames,
        processingMode,
        (current, total, percentage, stats) => {
          setProgress(percentage);
          const statusText = stats?.phase || `Processing ${current} of ${total} payees`;
          setProcessingStatus(statusText);
        },
        config
      );
          
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      if (processingMode === 'batch' && result.batchJob) {
        toast({
          title: "Batch Job Submitted",
          description: `Your file with ${payeeNames.length} payees has been submitted for batch processing. Check the "Batch Jobs" tab to track progress.`,
        });
        
        // For batch mode, we don't call onComplete immediately
        // The batch job will be tracked separately
        return;
      }

      // Map to PayeeClassification objects (for real-time mode)
      const classifications = payeeNames.map((name, index) => {
        return createPayeeClassification(name, result.results[index]);
      });

      const successCount = result.results.filter(r => r.confidence > 0).length;
      const failureCount = payeeNames.length - successCount;
      
      // Create summary
      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount,
        processingTime
      };
      
      // Call the onComplete callback
      onComplete(classifications, summary);
      
      toast({
        title: "Processing Complete",
        description: `Successfully classified ${successCount} payees from the uploaded file.`,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing Error",
        description: "An error occurred while processing the file.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
      setProcessingStatus("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File for Classification</CardTitle>
        <CardDescription>
          Upload an Excel or CSV file containing payee names for bulk classification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fileError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="file-upload">Upload Excel or CSV file</Label>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {file ? 'Change File' : 'Select File'}
            </Button>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">
            Accepted formats: Excel (.xlsx, .xls) or CSV files
          </p>
        </div>
        
        {columns.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="column-select">Select column with payee names</Label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger id="column-select">
                <SelectValue placeholder="Select a column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {isLoading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{processingStatus}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            type="button" 
            className="flex-1" 
            disabled={!file || !selectedColumn || isLoading}
            onClick={handleProcess}
          >
            {isLoading ? "Processing..." : "Process File"}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadForm;
