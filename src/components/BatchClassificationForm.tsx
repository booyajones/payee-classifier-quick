import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { processBatch, DEFAULT_CLASSIFICATION_CONFIG } from "@/lib/classificationEngine";
import { enhancedProcessBatch } from "@/lib/classification/enhancedClassification";
import { createPayeeClassification } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import ClassificationResultTable from "./ClassificationResultTable";
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from "@/lib/types";
import APIKeyInput from "./APIKeyInput";
import FileUploadForm from "./FileUploadForm";
import { getOpenAIClient } from "@/lib/openaiService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
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
  const [apiKeySet, setApiKeySet] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("text");
  const [progress, setProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [config, setConfig] = useState<ClassificationConfig>({
    ...DEFAULT_CLASSIFICATION_CONFIG,
    useEnhanced: false, // Default to standard mode instead of enhanced
    bypassRuleNLP: true, // Always use AI classification
  });
  const { toast } = useToast();

  // Check if API key is already set in session storage
  useEffect(() => {
    const storedApiKey = sessionStorage.getItem("openai_api_key");
    setApiKeySet(!!storedApiKey && getOpenAIClient() !== null);
  }, []);

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
      setProcessingStatus(`Processing 0 of ${names.length} payees`);
      
      const startTime = performance.now();
      
      // Use enhanced process batch if enabled
      const results = config.useEnhanced
        ? await enhancedProcessBatch(
            names,
            (current, total, percentage) => {
              setProgress(percentage);
              setProcessingStatus(`Processing ${current} of ${total} payees`);
            },
            config
          )
        : await processBatch(
            names,
            (current, total, percentage) => {
              setProgress(percentage);
              setProcessingStatus(`Processing ${current} of ${total} payees`);
            },
            config
          );
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const successCount = results.filter(result => result.confidence > 0).length;
      const failureCount = names.length - successCount;

      const classifications = names.map((name, index) => {
        return createPayeeClassification(name, results[index]);
      });

      setBatchResults(classifications);
      if (onBatchClassify) {
        onBatchClassify(classifications);
      }
      
      const summary: BatchProcessingResult = {
        results: classifications,
        successCount,
        failureCount,
        processingTime
      };
      
      setProcessingSummary(summary);
      
      // Call onComplete if provided
      if (onComplete) {
        onComplete(classifications, summary);
      }

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

  // Handle AI threshold change
  const handleThresholdChange = (value: number[]) => {
    setConfig(prev => ({ ...prev, aiThreshold: value[0] }));
  };

  // Handle AI-only mode toggle
  const handleAIOnlyToggle = (checked: boolean) => {
    setConfig(prev => ({ ...prev, bypassRuleNLP: checked }));
  };
  
  // Handle enhanced mode toggle
  const handleEnhancedToggle = (checked: boolean) => {
    setConfig(prev => ({ ...prev, useEnhanced: checked }));
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
              Enter a list of payee names or upload a file to classify them as businesses or individuals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 border rounded-md p-4 mb-6">
              <h3 className="text-md font-medium">Classification Settings</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="batchAiThreshold">AI Confidence Threshold: {config.aiThreshold}%</Label>
                  </div>
                  <Slider
                    id="batchAiThreshold"
                    min={0}
                    max={100}
                    step={5}
                    value={[config.aiThreshold]}
                    onValueChange={handleThresholdChange}
                    disabled={config.bypassRuleNLP}
                  />
                  <p className="text-xs text-muted-foreground">
                    {config.bypassRuleNLP 
                      ? "AI-Only mode is active - threshold is ignored"
                      : `AI will be used when rule-based or NLP classification confidence is below ${config.aiThreshold}%`}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="batchAiOnly"
                    checked={config.bypassRuleNLP}
                    onCheckedChange={handleAIOnlyToggle}
                  />
                  <Label htmlFor="batchAiOnly">AI-Only Mode</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, rule-based and NLP classification will be skipped, and all payees will be classified using AI
                </p>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="batchEnhancedMode"
                    checked={config.useEnhanced}
                    onCheckedChange={handleEnhancedToggle}
                  />
                  <Label htmlFor="batchEnhancedMode">Enhanced Mode</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, uses advanced techniques including consensus classification and multi-cultural name recognition
                </p>
              </div>
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
                      <RefreshCw className="h-4 w-4 mr-2" />
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
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default BatchClassificationForm;
