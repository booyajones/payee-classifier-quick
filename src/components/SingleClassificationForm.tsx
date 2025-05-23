
import { useState } from "react";
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
import { RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";

interface SingleClassificationFormProps {
  onClassify: (result: PayeeClassification) => void;
}

const SingleClassificationForm = ({ onClassify }: SingleClassificationFormProps) => {
  const [payeeName, setPayeeName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<PayeeClassification | null>(null);
  const [config, setConfig] = useState<ClassificationConfig>({
    ...DEFAULT_CLASSIFICATION_CONFIG,
    useEnhanced: false,
    bypassRuleNLP: true,
  });
  const { toast } = useToast();

  const resetForm = () => {
    setPayeeName("");
    setCurrentResult(null);
    
    toast({
      title: "Form Reset",
      description: "The classification form has been reset. You can now start over.",
    });
  };

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
      console.log(`Starting real OpenAI classification for: ${payeeName}`);
      
      // Use real OpenAI API for classification - force enhanced mode off to use standard API
      const result = await classifyPayee(payeeName, { ...config, useEnhanced: false }, false);
      const classification = createPayeeClassification(payeeName, result);
      
      console.log(`Classification result:`, result);
      
      setCurrentResult(classification);
      onClassify(classification);
      
      toast({
        title: "Classification Complete",
        description: `${payeeName} classified as ${result.classification} with ${result.confidence}% confidence using real OpenAI.`,
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

  // Handle AI threshold change
  const handleThresholdChange = (value: number[]) => {
    setConfig(prev => ({ ...prev, aiThreshold: value[0] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classify Single Payee</CardTitle>
        <CardDescription>
          Enter a payee name to classify it as a business or individual using real OpenAI API.
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
                  disabled={true}
                />
                <p className="text-xs text-muted-foreground">
                  Using AI-Only mode for maximum accuracy
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="aiOnly"
                  checked={true}
                  disabled={true}
                />
                <Label htmlFor="aiOnly">AI-Only Mode (Always On)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Using advanced AI classification powered by OpenAI for all payees to ensure maximum accuracy
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isProcessing}>
              {isProcessing ? "Classifying..." : "Classify Payee"}
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
