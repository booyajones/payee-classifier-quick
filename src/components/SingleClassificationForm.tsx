
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyPayee } from "@/lib/classificationEngine";
import { createPayeeClassification } from "@/lib/utils";
import ClassificationResultCard from "./ClassificationResultCard";
import { PayeeClassification } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";

interface SingleClassificationFormProps {
  onClassify: (result: PayeeClassification) => void;
}

const SingleClassificationForm = ({ onClassify }: SingleClassificationFormProps) => {
  const [payeeName, setPayeeName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<PayeeClassification | null>(null);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
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
    
    // Add a small delay to simulate processing
    setTimeout(() => {
      try {
        const result = classifyPayee(payeeName);
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
    }, 600);
  };

  return (
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
  );
};

export default SingleClassificationForm;
