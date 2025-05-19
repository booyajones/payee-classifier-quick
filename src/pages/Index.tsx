
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SingleClassificationForm from "@/components/SingleClassificationForm";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import ClassificationResultTable from "@/components/ClassificationResultTable";
import BatchProcessingSummary from "@/components/BatchProcessingSummary";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";

const Index = () => {
  const [activeTab, setActiveTab] = useState("single");
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchProcessingResult | null>(null);
  const [allResults, setAllResults] = useState<PayeeClassification[]>([]);

  const handleSingleClassification = (result: PayeeClassification) => {
    setAllResults(prev => [result, ...prev]);
  };

  const handleBatchComplete = (
    results: PayeeClassification[],
    summary: BatchProcessingResult
  ) => {
    setBatchResults(results);
    setBatchSummary(summary);
    setAllResults(prev => [...results, ...prev]);
    setActiveTab("results");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-6 mb-6">
        <div className="container px-4">
          <h1 className="text-2xl font-bold">Payee Classification System</h1>
          <p className="opacity-90">
            Automatically classify payee names as businesses or individuals
          </p>
        </div>
      </header>

      <main className="container px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">Single Classification</TabsTrigger>
            <TabsTrigger value="batch">Batch Classification</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="mt-6">
            <div className="grid grid-cols-1 gap-6">
              <SingleClassificationForm onClassify={handleSingleClassification} />
            </div>
          </TabsContent>
          
          <TabsContent value="batch" className="mt-6">
            <BatchClassificationForm onComplete={handleBatchComplete} />
          </TabsContent>
          
          <TabsContent value="results" className="mt-6">
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
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-muted py-4 text-center text-sm text-muted-foreground">
        <div className="container">
          <p>Payee Classification System &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
