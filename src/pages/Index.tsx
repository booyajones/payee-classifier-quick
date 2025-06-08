
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";

const Index = () => {
  const [classificationResults, setClassificationResults] = useState<PayeeClassification[]>([]);
  const [lastProcessingSummary, setLastProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [isApiKeySet, setIsApiKeySet] = useState(isOpenAIInitialized());

  const handleClassificationComplete = (results: PayeeClassification[], summary?: BatchProcessingResult) => {
    setClassificationResults(results);
    if (summary) {
      setLastProcessingSummary(summary);
    }
  };

  const handleApiKeyChange = () => {
    setIsApiKeySet(isOpenAIInitialized());
  };

  const handleApiKeySet = () => {
    setIsApiKeySet(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Payee Classification</h1>
            <p className="text-muted-foreground">AI-powered batch processing</p>
          </div>
          <ThemeToggle />
        </div>

        <BatchClassificationForm 
          onComplete={handleClassificationComplete}
          onApiKeySet={handleApiKeySet}
          onApiKeyChange={handleApiKeyChange}
        />
      </div>
    </div>
  );
};

export default Index;
