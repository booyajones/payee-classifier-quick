
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface BatchTextInputProps {
  payeeNames: string;
  setPayeeNames: (value: string) => void;
  onDirectProcessing: (payeeNames: string[]) => Promise<void>;
  onReset: () => void;
}

const BatchTextInput = ({ 
  payeeNames, 
  setPayeeNames, 
  onDirectProcessing, 
  onReset
}: BatchTextInputProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
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

    try {
      const names = payeeNames.split("\n").map(name => name.trim()).filter(name => name !== "");
      console.log(`[BATCH TEXT INPUT] Processing ${names.length} names:`, names);
      
      await onDirectProcessing(names);

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${names.length} payees.`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "An error occurred while processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Rule-Based Processing</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Fast, deterministic classification</li>
          <li>• Keyword exclusion filtering</li>
          <li>• Pattern-based business/individual detection</li>
          <li>• Instant results with detailed reasoning</li>
        </ul>
      </div>
      
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isProcessing || payeeCount === 0}>
          {isProcessing ? "Processing..." : `Process ${payeeCount} Payees`}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={isProcessing}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </form>
  );
};

export default BatchTextInput;
