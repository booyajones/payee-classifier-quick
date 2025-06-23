
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";

const Index = () => {
  const [classificationResults, setClassificationResults] = useState<PayeeClassification[]>([]);
  const [lastProcessingSummary, setLastProcessingSummary] = useState<BatchProcessingResult | null>(null);

  const handleClassificationComplete = (results: PayeeClassification[], summary?: BatchProcessingResult) => {
    setClassificationResults(results);
    if (summary) {
      setLastProcessingSummary(summary);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Payee Classification</h1>
            <p className="text-muted-foreground">Rule-based pattern matching and keyword exclusion</p>
          </div>
          <ThemeToggle />
        </div>

        <BatchClassificationForm 
          onComplete={handleClassificationComplete}
        />
      </div>
    </div>
  );
};

export default Index;
