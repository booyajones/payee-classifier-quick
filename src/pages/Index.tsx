import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SingleClassificationForm from "@/components/SingleClassificationForm";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import ClassificationResultTable from "@/components/ClassificationResultTable";
import BatchProcessingSummary from "@/components/BatchProcessingSummary";
import OpenAIKeySetup from "@/components/OpenAIKeySetup";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClassificationErrorBoundary from "@/components/ClassificationErrorBoundary";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";
import { logMemoryUsage } from "@/lib/openai/apiUtils";

const Index = () => {
  const [activeTab, setActiveTab] = useState("single");
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchProcessingResult | null>(null);
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

  const handleSingleClassification = (result: PayeeClassification) => {
    setAllResults(prev => [result, ...prev]);
    logMemoryUsage('Single classification complete');
  };

  const handleBatchComplete = (
    results: PayeeClassification[],
    summary: BatchProcessingResult
  ) => {
    setBatchResults(results);
    setBatchSummary(summary);
    setAllResults(prev => [...results, ...prev]);
    setActiveTab("results");
    logMemoryUsage('Batch processing complete');
  };

  const handleKeySet = () => {
    setHasApiKey(true);
  };

  if (!hasApiKey) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <header className="bg-primary text-white py-6 mb-6">
            <div className="container px-4">
              <h1 className="text-2xl font-bold">Payee Classification System</h1>
              <p className="opacity-90">
                Automatically classify payee names as businesses or individuals with AI
              </p>
            </div>
          </header>

          <main className="container px-4 pb-8">
            <div className="max-w-2xl mx-auto">
              <OpenAIKeySetup onKeySet={handleKeySet} />
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
            <h1 className="text-2xl font-bold">Payee Classification System V3</h1>
            <p className="opacity-90">
              Advanced AI classification with intelligent escalation and guaranteed success rate
            </p>
          </div>
        </header>

        <main className="container px-4 pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="single">Single Classification</TabsTrigger>
              <TabsTrigger value="batch">Batch Classification</TabsTrigger>
              <TabsTrigger value="keywords">Keyword Management</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="mt-6">
              <ClassificationErrorBoundary context="Single Classification">
                <div className="grid grid-cols-1 gap-6">
                  <SingleClassificationForm onClassify={handleSingleClassification} />
                </div>
              </ClassificationErrorBoundary>
            </TabsContent>
            
            <TabsContent value="batch" className="mt-6">
              <ClassificationErrorBoundary context="Batch Classification">
                <BatchClassificationForm onComplete={handleBatchComplete} />
              </ClassificationErrorBoundary>
            </TabsContent>
            
            <TabsContent value="keywords" className="mt-6">
              <ClassificationErrorBoundary context="Keyword Management">
                <KeywordExclusionManager />
              </ClassificationErrorBoundary>
            </TabsContent>
            
            <TabsContent value="results" className="mt-6">
              <ClassificationErrorBoundary context="Results Display">
                {batchSummary && batchResults.length > 0 && (
                  <BatchProcessingSummary summary={batchSummary} />
                )}
                
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">Classification Results</h2>
                  {allResults.length > 0 ? (
                    <ClassificationResultTable results={allResults} />
                  ) : (
                    <div className="text-center py-8 border rounded-md">
                      <p className="text-muted-foreground">
                        No classification results yet. Classify some payees to see results here.
                      </p>
                    </div>
                  )}
                </div>
              </ClassificationErrorBoundary>
            </TabsContent>
          </Tabs>
        </main>

        <footer className="bg-muted py-4 text-center text-sm text-muted-foreground">
          <div className="container">
            <p>Payee Classification System V3 with Intelligent Escalation &copy; {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
