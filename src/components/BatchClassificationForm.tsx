
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { processBatch } from "@/lib/classificationEngine";
import { createPayeeClassification } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import ClassificationResultTable from "./ClassificationResultTable";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from "@/lib/types";
import FileUploadForm from "./FileUploadForm";
import { RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  const [payeeNames, setPayeeNames] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<PayeeClassification[]>([]);
  const [processingSummary, setProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("text");
  const [progress, setProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const { toast } = useToast();

  // Configuration for AI-only mode with real OpenAI API
  const config: ClassificationConfig = {
    aiThreshold: 80,
    bypassRuleNLP: true, // Always use AI
    useEnhanced: false, // Always disabled
  };

  const resetForm = () => {
    setPayeeNames("");
    setBatchResults([]);
    setProcessingSummary(null);
    setProgress(0);
    setProcessingStatus("");
    
    toast({
      title: "Form Reset",
      description: "The batch classification form has been reset. You can now start over.",
    });
  };

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
    setProgress(0);
    setProcessingStatus("");

    try {
      const names = payeeNames.split("\n").map(name => name.trim()).filter(name => name !== "");
      console.log(`[BATCH FORM] Processing ${names.length} names:`, names);
      
      setProcessingStatus(`Processing 0 of ${names.length} payees`);
      
      const results = await processBatch(
        names,
        (current, total, percentage, stats) => {
          setProgress(percentage);
          setProcessingStatus(`Processing ${current} of ${total} payees`);
          console.log(`[BATCH FORM] Progress: ${current}/${total} (${percentage}%)`, stats);
        },
        config
      );

      console.log(`[BATCH FORM] Received ${results.length} results:`, results);

      const successCount = results.filter(result => result.confidence > 0).length;
      const failureCount = names.length - successCount;

      const classifications = names.map((name, index) => {
        const result = results[index];
        if (!result) {
          console.warn(`[BATCH FORM] Missing result for index ${index}, name: ${name}`);
        }
        return createPayeeClassification(name, result || {
          classification: 'Individual',
          confidence: 0,
          reasoning: 'No result found',
          processingTier: 'Rule-Based'
        });
      });

      console.log(`[BATCH FORM] Created ${classifications.length} classifications`);

      setBatchResults(classifications);
      if (onBatchClassify) {
        onBatchClassify(classifications);
      }
      
      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount
      };
      
      setProcessingSummary(summary);
      
      if (onComplete) {
        onComplete(classifications, summary);
      }

      toast({
        title: "Batch Classification Complete",
        description: `Successfully classified ${successCount} payees using OpenAI. ${failureCount} ${failureCount === 1 ? 'failure' : 'failures'}`,
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
      setProcessingStatus("");
      setProgress(0);
    }
  };

  const handleFileUploadComplete = (results: PayeeClassification[], summary: BatchProcessingResult) => {
    setBatchResults(results);
    setProcessingSummary(summary);
    
    if (onBatchClassify) {
      onBatchClassify(results);
    }
    
    if (onComplete) {
      onComplete(results, summary);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classify Batch of Payees</CardTitle>
        <CardDescription>
          Enter a list of payee names or upload a file to classify them as businesses or individuals using OpenAI's advanced AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 border rounded-md p-4 mb-6 bg-green-50 dark:bg-green-900/20">
          <h3 className="text-md font-medium text-green-900 dark:text-green-100">AI-Powered Classification</h3>
          <p className="text-sm text-green-800 dark:text-green-200">
            Using OpenAI's advanced AI models for maximum accuracy and intelligent payee classification.
          </p>
        </div>
      
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Text Input</TabsTrigger>
            <TabsTrigger value="file">File Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="mt-4">
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
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{processingStatus}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isProcessing}>
                  {isProcessing ? "Classifying..." : "Classify Batch"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="file" className="mt-4">
            <FileUploadForm onComplete={handleFileUploadComplete} config={config} />
          </TabsContent>
        </Tabs>

        {processingSummary && (
          <div className="mt-6">
            <BatchProcessingSummary summary={processingSummary} />
          </div>
        )}

        {batchResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Classification Results</h3>
            <ClassificationResultTable results={batchResults} />
            
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={isProcessing}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchClassificationForm;
