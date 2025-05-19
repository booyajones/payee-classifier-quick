
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { classifyPayee } from "@/lib/classificationEngine";
import { createPayeeClassification, examplePayees } from "@/lib/utils";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";

interface BatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onComplete }: BatchClassificationFormProps) => {
  const [payeeNames, setPayeeNames] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const names = payeeNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (names.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one payee name.",
        variant: "destructive",
      });
      return;
    }
    
    processNames(names);
  };
  
  const processNames = (names: string[]) => {
    setIsProcessing(true);
    setProgress(0);
    
    const total = names.length;
    const results: PayeeClassification[] = [];
    let processed = 0;
    let failures = 0;
    
    const startTime = performance.now();
    
    // Process in batches to avoid UI freezing
    const batchSize = 5;
    
    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, total);
      const batch = names.slice(startIndex, endIndex);
      
      batch.forEach(name => {
        try {
          const result = classifyPayee(name);
          const classification = createPayeeClassification(name, result);
          results.push(classification);
        } catch (error) {
          console.error(`Error classifying ${name}:`, error);
          failures++;
        }
        
        processed++;
        setProgress(Math.round((processed / total) * 100));
      });
      
      if (endIndex < total) {
        // Process next batch
        setTimeout(() => processBatch(endIndex), 0);
      } else {
        // All done
        const endTime = performance.now();
        const processingTime = Math.round((endTime - startTime) / 1000);
        
        const summary: BatchProcessingResult = {
          results,
          successCount: processed - failures,
          failureCount: failures,
          processingTime
        };
        
        onComplete(results, summary);
        
        toast({
          title: "Batch Processing Complete",
          description: `Processed ${processed} payees in ${processingTime} seconds.`,
        });
        
        setIsProcessing(false);
      }
    };
    
    // Start processing
    processBatch(0);
  };
  
  const loadExamples = () => {
    setPayeeNames(examplePayees.join('\n'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Classification</CardTitle>
        <CardDescription>
          Enter multiple payee names (one per line) to classify them in batch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={loadExamples}
                  disabled={isProcessing}
                >
                  Load Examples
                </Button>
              </div>
              <Textarea
                id="payeeNames"
                placeholder="Enter payee names (one per line)"
                value={payeeNames}
                onChange={(e) => setPayeeNames(e.target.value)}
                disabled={isProcessing}
                rows={10}
              />
            </div>
          </div>
          
          {isProcessing && (
            <div className="space-y-2 my-4">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? "Processing Batch..." : "Process Batch"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BatchClassificationForm;
