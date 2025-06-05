
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPayeeClassification } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import ClassificationResultTable from "./ClassificationResultTable";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig, ClassificationResult } from "@/lib/types";
import FileUploadForm from "./FileUploadForm";
import BatchJobManager from "./BatchJobManager";
import BatchProcessingModeSelector from "./BatchProcessingModeSelector";
import { RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { enhancedProcessBatchV3, exportResultsWithOriginalDataV3 } from "@/lib/classification/enhancedBatchProcessorV3";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import * as XLSX from 'xlsx';

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  const [payeeNames, setPayeeNames] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("text");
  const [progress, setProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingMode, setProcessingMode] = useState<'realtime' | 'batch'>('realtime');
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeNamesMap, setPayeeNamesMap] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  // V3 Configuration
  const config: ClassificationConfig = {
    aiThreshold: 80,
    bypassRuleNLP: true,
    useEnhanced: true,
    offlineMode: false,
    useFuzzyMatching: true,
    similarityThreshold: 85
  };

  const resetForm = () => {
    setPayeeNames("");
    setBatchResults([]);
    setProcessingSummary(null);
    setProgress(0);
    setProcessingStatus("");
    
    toast({
      title: "Form Reset",
      description: "The batch classification form has been reset. You can now start over.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payeeNames.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a list of payee names to classify.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setBatchResults([]);
    setProcessingSummary(null);
    setProgress(0);
    setProcessingStatus("");

    try {
      const names = payeeNames.split("\n").map(name => name.trim()).filter(name => name !== "");
      console.log(`[BATCH FORM V3] Processing ${names.length} names:`, names);
      
      setProcessingStatus(`Starting V3 processing for ${names.length} payees`);
      
      // Use V3 enhanced batch processor
      const result = await enhancedProcessBatchV3(names, config);

      console.log(`[BATCH FORM V3] Process result:`, result);

      // Real-time processing completed
      console.log(`[BATCH FORM V3] Received ${result.results.length} results:`, result.results);

      const successCount = result.results.filter(r => r.result.confidence > 0).length;
      const failureCount = names.length - successCount;

      const classifications = result.results;

      console.log(`[BATCH FORM V3] Created ${classifications.length} classifications`);

      setBatchResults(classifications);
      if (onBatchClassify) {
        onBatchClassify(classifications);
      }
      
      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount
      };
      
      setProcessingSummary(summary);
      
      if (onComplete) {
        onComplete(classifications, summary);
      }

      // Switch to results tab
      setActiveTab("results");

      toast({
        title: "V3 Classification Complete",
        description: `Successfully classified ${successCount} payees using V3 system. ${failureCount} ${failureCount === 1 ? 'failure' : 'failures'}`,
      });
    } catch (error) {
      console.error("V3 batch classification error:", error);
      toast({
        title: "Batch Classification Error",
        description: error instanceof Error ? error.message : "An error occurred while processing the batch.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      setProgress(0);
    }
  };

  const handleFileUploadComplete = (results: PayeeClassification[], summary: BatchProcessingResult) => {
    console.log(`[BATCH FORM V3] File upload complete with ${results.length} results`);
    setBatchResults(results);
    setProcessingSummary(summary);
    
    if (onBatchClassify) {
      onBatchClassify(results);
    }
    
    if (onComplete) {
      onComplete(results, summary);
    }

    // Switch to results tab
    setActiveTab("results");
  };

  const handleFileUploadBatchJob = (batchJob: BatchJob, payeeNames: string[]) => {
    console.log(`[BATCH FORM V3] File upload batch job created:`, batchJob);
    
    // Add batch job from file upload
    setBatchJobs(prev => {
      const newJobs = [...prev, batchJob];
      console.log(`[BATCH FORM V3] UPDATED batch jobs from file upload:`, newJobs);
      return newJobs;
    });
    
    setPayeeNamesMap(prev => {
      const newMap = { ...prev, [batchJob.id]: payeeNames };
      console.log(`[BATCH FORM V3] UPDATED payee names map from file upload:`, newMap);
      return newMap;
    });
    
    // Switch to jobs tab
    setActiveTab("jobs");
  };

  const handleJobUpdate = (updatedJob: BatchJob) => {
    console.log(`[BATCH FORM V3] Updating job:`, updatedJob);
    setBatchJobs(prev => {
      const newJobs = prev.map(job => job.id === updatedJob.id ? updatedJob : job);
      console.log(`[BATCH FORM V3] Updated batch jobs after update:`, newJobs);
      return newJobs;
    });
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[BATCH FORM V3] Job ${jobId} completed with ${results.length} results`);
    setBatchResults(results);
    setProcessingSummary(summary);
    
    if (onBatchClassify) {
      onBatchClassify(results);
    }
    
    if (onComplete) {
      onComplete(results, summary);
    }
    
    // Switch to results tab
    setActiveTab("results");
  };

  const handleJobDelete = (jobId: string) => {
    console.log(`[BATCH FORM V3] Deleting job: ${jobId}`);
    setBatchJobs(prev => {
      const newJobs = prev.filter(job => job.id !== jobId);
      console.log(`[BATCH FORM V3] Batch jobs after deletion:`, newJobs);
      return newJobs;
    });
    setPayeeNamesMap(prev => {
      const newMap = { ...prev };
      delete newMap[jobId];
      console.log(`[BATCH FORM V3] Payee names map after deletion:`, newMap);
      return newMap;
    });
  };

  const handleExportResults = () => {
    if (!processingSummary || batchResults.length === 0) {
      toast({
        title: "No Results to Export",
        description: "Please process some payees first before exporting results.",
        variant: "destructive",
      });
      return;
    }

    try {
      const exportData = exportResultsWithOriginalDataV3(processingSummary, true);
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Classification Results");
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `payee_classification_v3_${timestamp}.xlsx`;
      
      // Save file
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Export Complete",
        description: `Results exported to ${filename} with all V3 enhancement data.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Error",
        description: "Failed to export results. Please try again.",
        variant: "destructive",
      });
    }
  };

  const payeeCount = payeeNames.split("\n").filter(name => name.trim() !== "").length;

  console.log(`[BATCH FORM V3] RENDER - Active tab: ${activeTab}, Batch jobs: ${batchJobs.length}, Results: ${batchResults.length}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classify Batch of Payees (V3)</CardTitle>
        <CardDescription>
          Enter a list of payee names or upload a file to classify them as businesses or individuals using the advanced V3 system with guaranteed success.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Mode Selector */}
        <BatchProcessingModeSelector
          mode={processingMode}
          onModeChange={setProcessingMode}
          payeeCount={payeeCount}
        />
      
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text">Text Input</TabsTrigger>
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="jobs">
              Batch Jobs {batchJobs.length > 0 && `(${batchJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="payeeNames">Payee Names (one per line)</Label>
                  <Textarea
                    id="payeeNames"
                    placeholder="e.g.,&#x0a;John Smith&#x0a;Acme Corporation&#x0a;Jane Doe"
                    value={payeeNames}
                    onChange={(e) => setPayeeNames(e.target.value)}
                    disabled={isProcessing}
                    className="min-h-[150px]"
                  />
                </div>
              </div>
              
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{processingStatus}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isProcessing || payeeCount === 0}>
                  {isProcessing ? "Classifying with V3..." : "Classify with V3"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="file" className="mt-4">
            <FileUploadForm 
              onComplete={handleFileUploadComplete} 
              onBatchJobCreated={handleFileUploadBatchJob}
              config={config}
              processingMode={processingMode}
            />
          </TabsContent>

          <TabsContent value="jobs" className="mt-4">
            {batchJobs.length === 0 ? (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground">
                  No batch jobs yet. Submit a batch for processing to see jobs here.
                </p>
              </div>
            ) : (
              <BatchJobManager
                jobs={batchJobs}
                payeeNamesMap={payeeNamesMap}
                onJobUpdate={handleJobUpdate}
                onJobComplete={handleJobComplete}
                onJobDelete={handleJobDelete}
              />
            )}
          </TabsContent>
          
          <TabsContent value="results" className="mt-4">
            {processingSummary && (
              <div className="mb-6">
                <BatchProcessingSummary summary={processingSummary} />
              </div>
            )}

            {batchResults.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">V3 Classification Results</h3>
                <ClassificationResultTable results={batchResults} />
                
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportResults}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    Export V3 Results
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={isProcessing}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BatchClassificationForm;
