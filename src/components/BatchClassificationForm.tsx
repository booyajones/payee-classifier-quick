import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from "@/lib/types";
import FileUploadForm from "./FileUploadForm";
import BatchJobManager from "./BatchJobManager";
import BatchResultsDisplay from "./BatchResultsDisplay";
import { BatchJob, checkBatchJobStatus } from "@/lib/openai/trueBatchAPI";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const STORAGE_KEYS = {
  BATCH_JOBS: 'batch_classification_jobs',
  PAYEE_NAMES_MAP: 'batch_classification_payee_names',
  BATCH_RESULTS: 'batch_classification_results',
  PROCESSING_SUMMARY: 'batch_processing_summary'
};

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("file");
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [payeeNamesMap, setPayeeNamesMap] = useState<Record<string, string[]>>({});
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const { toast } = useToast();

  const config: ClassificationConfig = {
    aiThreshold: 80,
    bypassRuleNLP: true,
    useEnhanced: true,
    offlineMode: false,
    useFuzzyMatching: true,
    similarityThreshold: 85
  };

  // COMPREHENSIVE Save state to localStorage - ALWAYS SAVE EVERYTHING
  const saveToStorage = (
    jobs: BatchJob[], 
    payeeMap: Record<string, string[]>, 
    results: PayeeClassification[] = [],
    summary: BatchProcessingResult | null = null
  ) => {
    try {
      localStorage.setItem(STORAGE_KEYS.BATCH_JOBS, JSON.stringify(jobs));
      localStorage.setItem(STORAGE_KEYS.PAYEE_NAMES_MAP, JSON.stringify(payeeMap));
      localStorage.setItem(STORAGE_KEYS.BATCH_RESULTS, JSON.stringify(results));
      if (summary) {
        localStorage.setItem(STORAGE_KEYS.PROCESSING_SUMMARY, JSON.stringify(summary));
      }
      console.log(`[BATCH FORM] COMPREHENSIVE SAVE: ${jobs.length} jobs, ${Object.keys(payeeMap).length} payee maps, ${results.length} results`);
    } catch (error) {
      console.error('[BATCH FORM] Error saving to localStorage:', error);
      // Even if save fails, continue operation - don't break the app
    }
  };

  // Load and recover EVERYTHING from localStorage
  const loadFromStorage = async () => {
    try {
      const savedJobs = localStorage.getItem(STORAGE_KEYS.BATCH_JOBS);
      const savedPayeeMap = localStorage.getItem(STORAGE_KEYS.PAYEE_NAMES_MAP);
      const savedResults = localStorage.getItem(STORAGE_KEYS.BATCH_RESULTS);
      const savedSummary = localStorage.getItem(STORAGE_KEYS.PROCESSING_SUMMARY);

      console.log('[BATCH FORM] Loading from storage:', {
        hasJobs: !!savedJobs,
        hasPayeeMap: !!savedPayeeMap,
        hasResults: !!savedResults,
        hasSummary: !!savedSummary
      });

      // Load results and summary first
      if (savedResults) {
        const results: PayeeClassification[] = JSON.parse(savedResults);
        setBatchResults(results);
        console.log(`[BATCH FORM] Restored ${results.length} batch results`);
      }

      if (savedSummary) {
        const summary: BatchProcessingResult = JSON.parse(savedSummary);
        setProcessingSummary(summary);
        console.log('[BATCH FORM] Restored processing summary');
      }

      if (!savedJobs || !savedPayeeMap) {
        console.log('[BATCH FORM] No saved jobs found');
        setIsLoadingJobs(false);
        return;
      }

      const jobs: BatchJob[] = JSON.parse(savedJobs);
      const payeeMap: Record<string, string[]> = JSON.parse(savedPayeeMap);

      console.log(`[BATCH FORM] Found ${jobs.length} saved jobs, checking status...`);

      // Check status of each saved job - but KEEP ALL JOBS regardless of status
      const updatedJobs: BatchJob[] = [];
      const validPayeeMap: Record<string, string[]> = {};

      for (const job of jobs) {
        try {
          console.log(`[BATCH FORM] Checking status of job ${job.id}`);
          const updatedJob = await checkBatchJobStatus(job.id);
          updatedJobs.push(updatedJob);
          validPayeeMap[job.id] = payeeMap[job.id] || [];
          
          if (updatedJob.status !== job.status) {
            console.log(`[BATCH FORM] Job ${job.id} status changed: ${job.status} -> ${updatedJob.status}`);
          }
        } catch (error) {
          console.warn(`[BATCH FORM] Job ${job.id} status check failed, keeping original:`, error);
          // KEEP THE JOB even if status check fails - don't lose jobs!
          updatedJobs.push(job);
          validPayeeMap[job.id] = payeeMap[job.id] || [];
        }
      }

      setBatchJobs(updatedJobs);
      setPayeeNamesMap(validPayeeMap);

      // Save the updated state immediately
      saveToStorage(updatedJobs, validPayeeMap, batchResults, processingSummary);

      if (updatedJobs.length > 0) {
        setActiveTab("jobs");
        toast({
          title: "Session Restored",
          description: `Restored ${updatedJobs.length} batch job(s) and ${batchResults.length} results from previous session.`,
        });
      }

    } catch (error) {
      console.error('[BATCH FORM] Error loading from localStorage:', error);
      // Don't clear data on error - try to preserve what we can
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Load everything on component mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save EVERYTHING whenever ANY state changes
  useEffect(() => {
    if (!isLoadingJobs) {
      saveToStorage(batchJobs, payeeNamesMap, batchResults, processingSummary);
    }
  }, [batchJobs, payeeNamesMap, batchResults, processingSummary, isLoadingJobs]);

  const resetForm = () => {
    setBatchResults([]);
    setProcessingSummary(null);
    setBatchJobs([]);
    setPayeeNamesMap({});
    
    // Clear ALL localStorage
    localStorage.removeItem(STORAGE_KEYS.BATCH_JOBS);
    localStorage.removeItem(STORAGE_KEYS.PAYEE_NAMES_MAP);
    localStorage.removeItem(STORAGE_KEYS.BATCH_RESULTS);
    localStorage.removeItem(STORAGE_KEYS.PROCESSING_SUMMARY);
    
    toast({
      title: "Complete Reset",
      description: "All batch data has been cleared. You can now start fresh.",
    });
  };

  const handleFileUploadBatchJob = (batchJob: BatchJob, payeeNames: string[]) => {
    console.log(`[BATCH FORM] File upload batch job created:`, batchJob);
    
    setBatchJobs(prev => {
      const newJobs = [...prev, batchJob];
      console.log(`[BATCH FORM] Updated batch jobs from file upload:`, newJobs);
      return newJobs;
    });
    
    setPayeeNamesMap(prev => {
      const newMap = { ...prev, [batchJob.id]: payeeNames };
      console.log(`[BATCH FORM] Updated payee names map from file upload:`, newMap);
      return newMap;
    });
    
    setActiveTab("jobs");
  };

  const handleJobUpdate = (updatedJob: BatchJob) => {
    console.log(`[BATCH FORM] Updating job:`, updatedJob);
    setBatchJobs(prev => {
      const newJobs = prev.map(job => job.id === updatedJob.id ? updatedJob : job);
      console.log(`[BATCH FORM] Updated batch jobs after update:`, newJobs);
      return newJobs;
    });
  };

  const handleJobComplete = (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => {
    console.log(`[BATCH FORM] Job ${jobId} completed with ${results.length} results`);
    
    // ALWAYS preserve and append results - never overwrite
    setBatchResults(prev => {
      const newResults = [...prev, ...results];
      console.log(`[BATCH FORM] Total results now: ${newResults.length}`);
      return newResults;
    });
    
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
    console.log(`[BATCH FORM] Deleting job: ${jobId}`);
    setBatchJobs(prev => {
      const newJobs = prev.filter(job => job.id !== jobId);
      console.log(`[BATCH FORM] Batch jobs after deletion:`, newJobs);
      return newJobs;
    });
    setPayeeNamesMap(prev => {
      const newMap = { ...prev };
      delete newMap[jobId];
      console.log(`[BATCH FORM] Payee names map after deletion:`, newMap);
      return newMap;
    });
  };

  console.log(`[BATCH FORM] RENDER - Active tab: ${activeTab}, Batch jobs: ${batchJobs.length}, Results: ${batchResults.length}, Loading: ${isLoadingJobs}`);

  if (isLoadingJobs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Batch Payee Classification</CardTitle>
          <CardDescription>
            Loading previous session data...
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Restoring jobs, results, and session data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Payee Classification</CardTitle>
        <CardDescription>
          Upload files for payee classification processing. All data is automatically saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="jobs">
              Batch Jobs {batchJobs.length > 0 && `(${batchJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="results">
              Results {batchResults.length > 0 && `(${batchResults.length})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="mt-4">
            <FileUploadForm 
              onBatchJobCreated={handleFileUploadBatchJob}
              config={config}
            />
          </TabsContent>

          <TabsContent value="jobs" className="mt-4">
            {batchJobs.length === 0 ? (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground">
                  No batch jobs yet. Upload a file to see jobs here.
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
