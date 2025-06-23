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
import { v4 as uuidv4 } from 'uuid';

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
          id: uuidv4(),
          payeeName: name,
          result,
          timestamp: new Date()
        });
      }
      
      const summary: BatchProcessingResult = {
        results,
        successCount: results.length,
        failureCount: 0,
        processingTime: 0,
        originalFileData: undefined,
        enhancedStats: {
          totalProcessed: results.length,
          businessCount: results.filter(r => r.result.classification === 'Business').length,
          individualCount: results.filter(r => r.result.classification === 'Individual').length,
          excludedCount: results.filter(r => r.result.processingTier === 'Excluded').length,
          failedCount: 0,
          averageConfidence: results.reduce((sum, r) => sum + r.result.confidence, 0) / results.length,
          highConfidenceCount: results.filter(r => r.result.confidence >= 80).length,
          mediumConfidenceCount: results.filter(r => r.result.confidence >= 60 && r.result.confidence < 80).length,
          lowConfidenceCount: results.filter(r => r.result.confidence < 60).length,
          processingTierCounts: results.reduce((acc, r) => {
            acc[r.result.processingTier] = (acc[r.result.processingTier] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          processingTime: 0
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
