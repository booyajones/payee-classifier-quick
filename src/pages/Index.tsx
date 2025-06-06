
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import ClassificationResultTable from "@/components/ClassificationResultTable";
import BatchProcessingSummary from "@/components/BatchProcessingSummary";
import OpenAIKeySetup from "@/components/OpenAIKeySetup";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import OpenAIDiagnostics from "@/components/OpenAIDiagnostics";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClassificationErrorBoundary from "@/components/ClassificationErrorBoundary";
import ChatWidget from "@/components/chat/ChatWidget";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";
import { logMemoryUsage } from "@/lib/openai/apiUtils";

const Index = () => {
  const [activeTab, setActiveTab] = useState("batch");
  const [allBatchSummaries, setAllBatchSummaries] = useState<BatchProcessingResult[]>([]);
  const [allResults, setAllResults] = useState<PayeeClassification[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    setHasApiKey(isOpenAIInitialized());
    logMemoryUsage('Index component mount');
  }, []);

  // Log memory usage on tab changes
  useEffect(() => {
    logMemoryUsage(`Tab change to ${activeTab}`);
  }, [activeTab]);

  const handleBatchComplete = (
    results: PayeeClassification[],
    summary: BatchProcessingResult
  ) => {
    console.log('[INDEX] Batch complete - adding to persistent results:', {
      newResultsCount: results.length,
      currentResultsCount: allResults.length,
      totalAfterAdd: allResults.length + results.length
    });
    
    // Add to historical summaries instead of replacing
    setAllBatchSummaries(prev => [summary, ...prev]);
    // Add to all results instead of replacing - accumulate all results
    setAllResults(prev => [...prev, ...results]);
    setActiveTab("results");
    logMemoryUsage('Batch processing complete');
  };

  const handleKeySet = () => {
    setHasApiKey(true);
  };

  const handleDiagnosticsReset = () => {
    setHasApiKey(false);
  };

  if (!hasApiKey) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <header className="bg-primary text-white py-6 mb-6">
            <div className="container px-4">
              <h1 className="text-2xl font-bold">Payee Classification System</h1>
              <p className="opacity-90">
                Efficient file-based payee classification processing
              </p>
            </div>
          </header>

          <main className="container px-4 pb-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <OpenAIKeySetup onKeySet={handleKeySet} />
              <OpenAIDiagnostics onReset={handleDiagnosticsReset} />
            </div>
          </main>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-white py-6 mb-6">
          <div className="container px-4">
            <h1 className="text-2xl font-bold">Payee Classification System</h1>
            <p className="opacity-90">
              File-based payee classification processing
            </p>
          </div>
        </header>

        <main className="container px-4 pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="batch">File Processing</TabsTrigger>
              <TabsTrigger value="keywords">Keyword Management</TabsTrigger>
              <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
              <TabsTrigger value="results">
                Results {allResults.length > 0 && `(${allResults.length})`}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="batch" className="mt-6">
              <ClassificationErrorBoundary context="File Processing">
                <BatchClassificationForm onComplete={handleBatchComplete} />
              </ClassificationErrorBoundary>
            </TabsContent>
            
            <TabsContent value="keywords" className="mt-6">
              <ClassificationErrorBoundary context="Keyword Management">
                <KeywordExclusionManager />
              </ClassificationErrorBoundary>
            </TabsContent>
            
            <TabsContent value="diagnostics" className="mt-6">
              <ClassificationErrorBoundary context="Diagnostics">
                <OpenAIDiagnostics onReset={handleDiagnosticsReset} />
              </ClassificationErrorBoundary>
            </TabsContent>
            
            <TabsContent value="results" className="mt-6">
              <ClassificationErrorBoundary context="Results Display">
                <div className="space-y-6">
                  {allBatchSummaries.map((summary, index) => (
                    <div key={index} className="space-y-4">
                      <BatchProcessingSummary summary={summary} />
                    </div>
                  ))}
                  
                  <div>
                    <h2 className="text-xl font-bold mb-4">All Classification Results</h2>
                    {allResults.length > 0 ? (
                      <ClassificationResultTable results={allResults} />
                    ) : (
                      <div className="text-center py-8 border rounded-md">
                        <p className="text-muted-foreground">
                          No classification results yet. Upload a file to see results here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </ClassificationErrorBoundary>
            </TabsContent>
          </Tabs>
        </main>

        <footer className="bg-muted py-4 text-center text-sm text-muted-foreground">
          <div className="container">
            <p>Payee Classification System &copy; {new Date().getFullYear()}</p>
          </div>
        </footer>

        {/* Chat Widget */}
        <ChatWidget />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
