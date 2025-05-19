
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyPayee } from "@/lib/classificationEngine";
import { createPayeeClassification } from "@/lib/utils";
import ClassificationResultCard from "./ClassificationResultCard";
import { PayeeClassification } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { getOpenAIClient } from "@/lib/openaiService";
import APIKeyInput from "./APIKeyInput";

interface SingleClassificationFormProps {
  onClassify: (result: PayeeClassification) => void;
}

const SingleClassificationForm = ({ onClassify }: SingleClassificationFormProps) => {
  const [payeeName, setPayeeName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<PayeeClassification | null>(null);
  const [apiKeySet, setApiKeySet] = useState<boolean>(() => {
    // Check if API key is already set in session storage
    return !!sessionStorage.getItem("openai_api_key");
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payeeName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a payee name to classify.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Classification is now async
      const result = await classifyPayee(payeeName);
      const classification = createPayeeClassification(payeeName, result);
      
      setCurrentResult(classification);
      onClassify(classification);
      
      toast({
        title: "Classification Complete",
        description: `${payeeName} classified as ${result.classification} with ${result.confidence}% confidence.`,
      });
    } catch (error) {
      console.error("Classification error:", error);
      toast({
        title: "Classification Error",
        description: "An error occurred while processing your request.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if OpenAI API key is set
  const isAIEnabled = getOpenAIClient() !== null || apiKeySet;

  return (
    <>
      {!isAIEnabled ? (
        <APIKeyInput onApiKeySet={() => setApiKeySet(true)} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Classify Single Payee</CardTitle>
            <CardDescription>
              Enter a payee name to classify it as a business or individual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <Input
                    id="payeeName"
                    placeholder="Enter payee name"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? "Classifying..." : "Classify Payee"}
              </Button>
            </form>

            {currentResult && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Classification Result</h3>
                <ClassificationResultCard result={currentResult} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default SingleClassificationForm;
