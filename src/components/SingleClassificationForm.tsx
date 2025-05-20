
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { classifyPayee, DEFAULT_CLASSIFICATION_CONFIG } from "@/lib/classificationEngine";
import { createPayeeClassification } from "@/lib/utils";
import ClassificationResultCard from "./ClassificationResultCard";
import { PayeeClassification, ClassificationConfig } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { getOpenAIClient } from "@/lib/openaiService";
import APIKeyInput from "./APIKeyInput";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";

interface SingleClassificationFormProps {
  onClassify: (result: PayeeClassification) => void;
}

const SingleClassificationForm = ({ onClassify }: SingleClassificationFormProps) => {
  const [payeeName, setPayeeName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<PayeeClassification | null>(null);
  const [apiKeySet, setApiKeySet] = useState<boolean>(false);
  const [config, setConfig] = useState<ClassificationConfig>({
    ...DEFAULT_CLASSIFICATION_CONFIG,
    useEnhanced: true // Default to enhanced mode
  });
  const { toast } = useToast();

  // Check if API key is already set in session storage
  useEffect(() => {
    const storedApiKey = sessionStorage.getItem("openai_api_key");
    setApiKeySet(!!storedApiKey && getOpenAIClient() !== null);
  }, []);

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
      // Classification is now async and uses the config with enhanced flag
      const result = await classifyPayee(payeeName, config, config.useEnhanced);
      const classification = createPayeeClassification(payeeName, result);
      
      setCurrentResult(classification);
      onClassify(classification);
      
      toast({
        title: "Classification Complete",
        description: `${payeeName} classified as ${result.classification} with ${result.confidence}% confidence using ${result.processingTier}.`,
      });
    } catch (error) {
      console.error("Classification error:", error);
      toast({
        title: "Classification Error",
        description: error instanceof Error ? error.message : "An error occurred while processing your request.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if OpenAI API key is set
  const isAIEnabled = apiKeySet || getOpenAIClient() !== null;

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
            <CardTitle>Classify Single Payee</CardTitle>
            <CardDescription>
              Enter a payee name to classify it as a business or individual using our AI-powered system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <Input
                    id="payeeName"
                    placeholder="Enter payee name (e.g., John Smith, Acme Corporation)"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              </div>
              
              <div className="space-y-4 border rounded-md p-4">
                <h3 className="text-md font-medium">Classification Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="aiThreshold">AI Confidence Threshold: {config.aiThreshold}%</Label>
                    </div>
                    <Slider
                      id="aiThreshold"
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
                      id="aiOnly"
                      checked={config.bypassRuleNLP}
                      onCheckedChange={handleAIOnlyToggle}
                    />
                    <Label htmlFor="aiOnly">AI-Only Mode</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, rule-based and NLP classification will be skipped, and all payees will be classified using AI
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enhancedMode"
                      checked={config.useEnhanced}
                      onCheckedChange={handleEnhancedToggle}
                    />
                    <Label htmlFor="enhancedMode">Enhanced Mode (99.5% Accuracy)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, uses advanced techniques including consensus classification, multi-cultural name recognition, and cache optimization
                  </p>
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
