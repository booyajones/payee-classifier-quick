
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import ClassificationResultTable from "./ClassificationResultTable";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from "@/lib/types";
import FileUploadForm from "./FileUploadForm";
import BatchJobManager from "./BatchJobManager";
import BatchProcessingModeSelector from "./BatchProcessingModeSelector";
import BatchTextInput from "./BatchTextInput";
import BatchResultsDisplay from "./BatchResultsDisplay";
import { BatchJob } from "@/lib/openai/trueBatchAPI";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  const [payeeNames, setPayeeNames] = useState("");
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("text");
  const [processingMode, setProcessingMode] = useState<'realtime' | 'batch'>('realtime');
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeNamesMap, setPayeeNamesMap] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

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
    
    toast({
      title: "Form Reset",
      description: "The batch classification form has been reset. You can now start over.",
    });
  };

  const handleTextInputComplete = (results: PayeeClassification[], summary: BatchProcessingResult) => {
    setBatchResults(results);
    setProcessingSummary(summary);
    
    if (onBatchClassify) {
      onBatchClassify(results);
    }
    
    if (onComplete) {
      onComplete(results, summary);
    }

    setActiveTab("results");
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

    setActiveTab("results");
  };

  const handleFileUploadBatchJob = (batchJob: BatchJob, payeeNames: string[]) => {
    console.log(`[BATCH FORM V3] File upload batch job created:`, batchJob);
    
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
            <BatchTextInput
              payeeNames={payeeNames}
              setPayeeNames={setPayeeNames}
              onComplete={handleTextInputComplete}
              onReset={resetForm}
              config={config}
            />
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
            <BatchResultsDisplay
              batchResults={batchResults}
              processingSummary={processingSummary}
              onReset={resetForm}
              isProcessing={false}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BatchClassificationForm;
