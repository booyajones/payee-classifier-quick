
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { processBatch } from "@/lib/classificationEngine";
import { createPayeeClassification } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import ClassificationResultTable from "./ClassificationResultTable";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import APIKeyInput from "./APIKeyInput";
import { getOpenAIClient } from "@/lib/openaiService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface BatchClassificationFormProps {
  onBatchClassify: (results: PayeeClassification[]) => void;
}

const BatchClassificationForm = ({ onBatchClassify }: BatchClassificationFormProps) => {
  const [payeeNames, setPayeeNames] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [apiKeySet, setApiKeySet] = useState<boolean>(false);
  const { toast } = useToast();

  // Check if API key is already set in session storage
  useEffect(() => {
    const storedApiKey = sessionStorage.getItem("openai_api_key");
    setApiKeySet(!!storedApiKey && getOpenAIClient() !== null);
  }, []);

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

    try {
      const names = payeeNames.split("\n").map(name => name.trim()).filter(name => name !== "");
      const startTime = performance.now();
      const results = await processBatch(names);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const successCount = results.filter(result => result.confidence > 0).length;
      const failureCount = names.length - successCount;

      const classifications = names.map((name, index) => {
        return createPayeeClassification(name, results[index]);
      });

      setBatchResults(classifications);
      onBatchClassify(classifications);
      
      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount,
        processingTime
      };
      
      setProcessingSummary(summary);

      toast({
        title: "Batch Classification Complete",
        description: `Successfully classified ${successCount} payees. ${failureCount} ${failureCount === 1 ? 'failure' : 'failures'}`,
      });
    } catch (error) {
      console.error("Batch classification error:", error);
      toast({
        title: "Batch Classification Error",
        description: error instanceof Error ? error.message : "An error occurred while processing the batch.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if OpenAI API key is set
  const isAIEnabled = apiKeySet || getOpenAIClient() !== null;

  return (
    <>
      {!isAIEnabled ? (
        <>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>OpenAI API Key Required</AlertTitle>
            <AlertDescription>
              To enable AI-powered classification, please set your OpenAI API key below.
            </AlertDescription>
          </Alert>
          <APIKeyInput onApiKeySet={() => setApiKeySet(true)} />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Classify Batch of Payees</CardTitle>
            <CardDescription>
              Enter a list of payee names, one per line, to classify them as businesses or individuals.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? "Classifying..." : "Classify Batch"}
              </Button>
            </form>

            {processingSummary && (
              <div className="mt-6">
                <BatchProcessingSummary summary={processingSummary} />
              </div>
            )}

            {batchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Classification Results</h3>
                <ClassificationResultTable results={batchResults} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default BatchClassificationForm;
