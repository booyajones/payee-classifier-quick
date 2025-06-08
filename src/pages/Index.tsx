
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, Settings } from "lucide-react";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import APIKeyInput from "@/components/APIKeyInput";
import OpenAIDiagnostics from "@/components/OpenAIDiagnostics";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { isOpenAIInitialized } from "@/lib/openai/client";

const Index = () => {
  const [classificationResults, setClassificationResults] = useState<PayeeClassification[]>([]);
  const [lastProcessingSummary, setLastProcessingSummary] = useState<BatchProcessingResult | null>(null);
  const [isApiKeySet, setIsApiKeySet] = useState(isOpenAIInitialized());

  const handleClassificationComplete = (results: PayeeClassification[], summary?: BatchProcessingResult) => {
    setClassificationResults(results);
    if (summary) {
      setLastProcessingSummary(summary);
    }
  };

  const handleApiKeyChange = () => {
    setIsApiKeySet(isOpenAIInitialized());
  };

  const handleApiKeySet = () => {
    setIsApiKeySet(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                AI Payee Classification System
              </h1>
              <p className="text-xl text-muted-foreground">
                Classify payees as Business or Individual using advanced AI
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {!isApiKeySet && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please set your OpenAI API key in the Settings tab to begin classification.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="batch" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Batch Processing
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batch">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Batch Processing
                </CardTitle>
                <CardDescription>
                  Upload a CSV or Excel file to classify multiple payees at once.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BatchClassificationForm onComplete={handleClassificationComplete} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <APIKeyInput 
                onApiKeySet={handleApiKeySet}
                onApiKeyChange={handleApiKeyChange} 
              />
              <OpenAIDiagnostics />
              <KeywordExclusionManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
