
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { enhancedProcessBatchV3 } from "@/lib/classification/enhancedBatchProcessorV3";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from "@/lib/types";
import BatchProcessingProgress from "./BatchProcessingProgress";

interface BatchTextInputProps {
  payeeNames: string;
  setPayeeNames: (value: string) => void;
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onReset: () => void;
  config: ClassificationConfig;
}

const BatchTextInput = ({ 
  payeeNames, 
  setPayeeNames, 
  onComplete, 
  onReset,
  config 
}: BatchTextInputProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const { toast } = useToast();

  const payeeCount = payeeNames.split("\n").filter(name => name.trim() !== "").length;

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
    setProgress(0);
    setProcessingStatus("");

    try {
      const names = payeeNames.split("\n").map(name => name.trim()).filter(name => name !== "");
      console.log(`[BATCH TEXT INPUT V3] Processing ${names.length} names:`, names);
      
      setProcessingStatus(`Starting V3 processing for ${names.length} payees`);
      
      const result = await enhancedProcessBatchV3(names, config);
      console.log(`[BATCH TEXT INPUT V3] Process result:`, result);

      const successCount = result.results.filter(r => r.result.confidence > 0).length;
      const failureCount = names.length - successCount;

      const summary: BatchProcessingResult = {
        results: result.results,
        successCount,
        failureCount
      };
      
      onComplete(result.results, summary);

      toast({
        title: "V3 Classification Complete",
        description: `Successfully classified ${successCount} payees using V3 system. ${failureCount} ${failureCount === 1 ? 'failure' : 'failures'}`,
      });
    } catch (error) {
      console.error("V3 batch classification error:", error);
      toast({
        title: "Batch Classification Error",
        description: error instanceof Error ? error.message : "An error occurred while processing the batch.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      setProgress(0);
    }
  };

  return (
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
      
      {isProcessing && (
        <BatchProcessingProgress 
          progress={progress}
          status={processingStatus}
        />
      )}
      
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isProcessing || payeeCount === 0}>
          {isProcessing ? "Classifying with V3..." : "Classify with V3"}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={isProcessing}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Start Over
        </Button>
      </div>
    </form>
  );
};

export default BatchTextInput;
