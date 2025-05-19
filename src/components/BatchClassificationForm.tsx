import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { classifyPayee } from "@/lib/classificationEngine";
import { createPayeeClassification, examplePayees, parseUploadedFile } from "@/lib/utils";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Upload } from "lucide-react";

interface BatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onComplete }: BatchClassificationFormProps) => {
  const [payeeNames, setPayeeNames] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [inputMethod, setInputMethod] = useState<"text" | "file">("text");
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    try {
      setFile(selectedFile);
      // Parse the file to get column headers
      const fileColumns = await parseUploadedFile(selectedFile, true);
      setColumns(fileColumns);
      if (fileColumns.length > 0) {
        setSelectedColumn(fileColumns[0]);
      }
      
      toast({
        title: "File Uploaded",
        description: `${selectedFile.name} has been loaded successfully.`,
      });
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Error",
        description: "Failed to parse the uploaded file. Please ensure it's a valid CSV or Excel file.",
        variant: "destructive",
      });
      setFile(null);
      setColumns([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let names: string[] = [];
    
    if (inputMethod === "text") {
      names = payeeNames
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    } else if (file && selectedColumn) {
      try {
        // Parse the file and extract the selected column data
        const data = await parseUploadedFile(file, false);
        names = data
          .map(row => row[selectedColumn])
          .filter(Boolean)
          .map(name => name.trim())
          .filter(name => name.length > 0);
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          title: "Error",
          description: "Failed to process the uploaded file.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (names.length === 0) {
      toast({
        title: "Validation Error",
        description: inputMethod === "text" 
          ? "Please enter at least one payee name." 
          : "No valid payee names found in the selected column.",
        variant: "destructive",
      });
      return;
    }
    
    processNames(names);
  };
  
  const processNames = async (names: string[]) => {
    setIsProcessing(true);
    setProgress(0);
    
    const total = names.length;
    const results: PayeeClassification[] = [];
    let processed = 0;
    let failures = 0;
    
    const startTime = performance.now();
    
    // Process in batches to avoid UI freezing
    const batchSize = 5;
    
    const processBatch = async (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, total);
      const batch = names.slice(startIndex, endIndex);
      
      for (const name of batch) {
        try {
          // Updated to properly await the async classification
          const result = await classifyPayee(name);
          const classification = createPayeeClassification(name, result);
          results.push(classification);
        } catch (error) {
          console.error(`Error classifying ${name}:`, error);
          failures++;
        }
        
        processed++;
        setProgress(Math.round((processed / total) * 100));
      }
      
      if (endIndex < total) {
        // Process next batch
        setTimeout(() => processBatch(endIndex), 0);
      } else {
        // All done
        const endTime = performance.now();
        const processingTime = Math.round((endTime - startTime) / 1000);
        
        const summary: BatchProcessingResult = {
          results,
          successCount: processed - failures,
          failureCount: failures,
          processingTime
        };
        
        onComplete(results, summary);
        
        toast({
          title: "Batch Processing Complete",
          description: `Processed ${processed} payees in ${processingTime} seconds.`,
        });
        
        setIsProcessing(false);
      }
    };
    
    // Start processing
    processBatch(0);
  };
  
  const loadExamples = () => {
    setPayeeNames(examplePayees.join('\n'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Classification</CardTitle>
        <CardDescription>
          Enter multiple payee names or upload a file to classify them in batch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as "text" | "file")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="text">
              Enter Text
            </TabsTrigger>
            <TabsTrigger value="file">
              Upload File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4">
            <form id="textForm" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={loadExamples}
                      disabled={isProcessing}
                    >
                      Load Examples
                    </Button>
                  </div>
                  <Textarea
                    id="payeeNames"
                    placeholder="Enter payee names (one per line)"
                    value={payeeNames}
                    onChange={(e) => setPayeeNames(e.target.value)}
                    disabled={isProcessing}
                    rows={10}
                  />
                </div>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="file" className="space-y-4">
            <form id="fileForm" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Upload CSV or Excel file
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                  {file && (
                    <div className="text-sm text-muted-foreground">
                      <FileSpreadsheet className="inline-block mr-1 h-4 w-4" /> {file.name}
                    </div>
                  )}
                </div>
                
                {columns.length > 0 && (
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Select column containing payee names
                    </label>
                    <Select
                      value={selectedColumn}
                      onValueChange={setSelectedColumn}
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="w-full">
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
              </div>
            </form>
          </TabsContent>
        </Tabs>
        
        {isProcessing && (
          <div className="space-y-2 my-4">
            <div className="flex justify-between text-sm">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
        
        <Button
          type="submit"
          className="w-full mt-4"
          disabled={isProcessing || (inputMethod === "file" && (!file || !selectedColumn))}
          onClick={handleSubmit}
        >
          {isProcessing ? "Processing Batch..." : "Process Batch"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BatchClassificationForm;
