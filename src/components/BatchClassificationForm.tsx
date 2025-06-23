
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import BatchResultsDisplay from "./BatchResultsDisplay";
import FileUploadForm from "./FileUploadForm";
import BatchTextInput from "./BatchTextInput";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { cleanProcessBatch } from "@/lib/classification/cleanBatchProcessor";
import { ruleOnlyClassification } from "@/lib/classification/ruleOnlyClassification";
import { exportResultsFixed } from "@/lib/classification/fixedExporter";

interface BatchClassificationFormProps {
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onComplete }: BatchClassificationFormProps) => {
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payeeNames, setPayeeNames] = useState("");
  const { toast } = useToast();

  const handleFileProcessing = async (originalFileData: any[], selectedColumn: string) => {
    setIsProcessing(true);
    
    try {
      const result = await cleanProcessBatch(originalFileData, selectedColumn, {
        aiThreshold: 75,
        bypassRuleNLP: false,
        useEnhanced: true,
        offlineMode: true // Use offline mode for rule-only processing
      });
      
      setBatchResults(result.results);
      setProcessingSummary(result);
      onComplete(result.results, result);
      
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${result.results.length} payees.`,
      });
      
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextProcessing = async (names: string[]) => {
    setIsProcessing(true);
    
    try {
      const results: PayeeClassification[] = [];
      
      for (const name of names) {
        const result = await ruleOnlyClassification(name);
        results.push({
          payeeName: name,
          result,
          processingTime: 0 // Rule-based is instant
        });
      }
      
      const summary: BatchProcessingResult = {
        results,
        successCount: results.length,
        failureCount: 0,
        totalProcessed: results.length,
        processingTime: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        config: {
          aiThreshold: 75,
          bypassRuleNLP: false,
          useEnhanced: true,
          offlineMode: true
        }
      };
      
      setBatchResults(results);
      setProcessingSummary(summary);
      onComplete(results, summary);
      
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${results.length} payees.`,
      });
      
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setBatchResults([]);
    setProcessingSummary(null);
    setPayeeNames("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payee Classification</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">File Upload</TabsTrigger>
              <TabsTrigger value="text">Text Input</TabsTrigger>
            </TabsList>
            
            <TabsContent value="file" className="space-y-4">
              <FileUploadForm 
                onDirectProcessing={handleFileProcessing}
                isProcessing={isProcessing}
              />
            </TabsContent>
            
            <TabsContent value="text" className="space-y-4">
              <BatchTextInput
                payeeNames={payeeNames}
                setPayeeNames={setPayeeNames}
                onDirectProcessing={handleTextProcessing}
                onReset={() => setPayeeNames("")}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <BatchResultsDisplay
        batchResults={batchResults}
        processingSummary={processingSummary}
        onReset={handleReset}
        isProcessing={isProcessing}
        exportFunction={exportResultsFixed}
      />
    </div>
  );
};

export default BatchClassificationForm;
