
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Zap, User, FileText, Settings } from "lucide-react";
import SingleClassificationForm from "@/components/SingleClassificationForm";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import FixedBatchClassificationForm from "@/components/FixedBatchClassificationForm";
import APIKeyInput from "@/components/APIKeyInput";
import OpenAIDiagnostics from "@/components/OpenAIDiagnostics";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            AI Payee Classification System
          </h1>
          <p className="text-xl text-muted-foreground">
            Classify payees as Business or Individual using advanced AI
          </p>
        </div>

        {!isApiKeySet && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please set your OpenAI API key in the Diagnostics tab to begin classification.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="fixed-batch" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="fixed-batch" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Fixed Batch
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              OpenAI Batch
            </TabsTrigger>
            <TabsTrigger value="single" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Single
            </TabsTrigger>
            <TabsTrigger value="keywords" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Diagnostics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fixed-batch">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Fixed Batch Processing
                </CardTitle>
                <CardDescription>
                  Improved batch processing with balanced classification, no duplicates, and perfect data alignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FixedBatchClassificationForm onComplete={handleClassificationComplete} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batch">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  OpenAI Batch Processing
                </CardTitle>
                <CardDescription>
                  Original OpenAI batch processing (may have issues with duplicates and bias).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BatchClassificationForm onComplete={handleClassificationComplete} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Single Classification
                </CardTitle>
                <CardDescription>
                  Classify individual payee names one at a time for testing and validation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SingleClassificationForm onComplete={handleClassificationComplete} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords">
            <KeywordExclusionManager />
          </TabsContent>

          <TabsContent value="diagnostics">
            <div className="space-y-6">
              <APIKeyInput onApiKeyChange={handleApiKeyChange} />
              <OpenAIDiagnostics />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
