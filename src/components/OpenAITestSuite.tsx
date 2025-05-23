
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Play, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { classifyPayeeWithAI } from "@/lib/openai/singleClassification";
import { classifyPayeesBatchWithAI } from "@/lib/openai/batchClassification";
import { isOpenAIInitialized } from "@/lib/openai/client";

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

const OpenAITestSuite = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "OpenAI Client Initialization", status: 'pending' },
    { name: "Single Business Classification", status: 'pending' },
    { name: "Single Individual Classification", status: 'pending' },
    { name: "Batch Classification", status: 'pending' },
    { name: "Error Handling", status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTest = async (index: number, testFn: () => Promise<void>) => {
    updateTest(index, { status: 'running' });
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(index, { status: 'passed', duration, message: `Completed in ${duration}ms` });
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'failed', 
        duration, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    
    try {
      // Test 1: Client Initialization
      await runTest(0, async () => {
        if (!isOpenAIInitialized()) {
          throw new Error("OpenAI client not initialized");
        }
      });

      // Test 2: Single Business Classification
      await runTest(1, async () => {
        const result = await classifyPayeeWithAI("Microsoft Corporation LLC");
        if (result.classification !== 'Business') {
          throw new Error(`Expected Business, got ${result.classification}`);
        }
        if (result.confidence < 50) {
          throw new Error(`Low confidence: ${result.confidence}%`);
        }
      });

      // Test 3: Single Individual Classification
      await runTest(2, async () => {
        const result = await classifyPayeeWithAI("John Smith");
        if (result.classification !== 'Individual') {
          throw new Error(`Expected Individual, got ${result.classification}`);
        }
        if (result.confidence < 50) {
          throw new Error(`Low confidence: ${result.confidence}%`);
        }
      });

      // Test 4: Batch Classification
      await runTest(3, async () => {
        const results = await classifyPayeesBatchWithAI([
          "Apple Inc", 
          "Jane Doe", 
          "Google LLC"
        ]);
        if (results.length !== 3) {
          throw new Error(`Expected 3 results, got ${results.length}`);
        }
        const allValid = results.every(r => 
          ['Business', 'Individual'].includes(r.classification) && 
          r.confidence > 0 && 
          r.reasoning
        );
        if (!allValid) {
          throw new Error("Invalid batch results structure");
        }
      });

      // Test 5: Error Handling
      await runTest(4, async () => {
        try {
          await classifyPayeeWithAI("");
          throw new Error("Should have thrown error for empty input");
        } catch (error) {
          if (error instanceof Error && error.message.includes("Invalid payee name")) {
            // Expected error
          } else {
            throw error;
          }
        }
      });

      toast({
        title: "Test Suite Complete",
        description: "All OpenAI integration tests have been executed.",
      });
    } catch (error) {
      console.error("Test suite error:", error);
      toast({
        title: "Test Suite Error",
        description: "An error occurred while running the test suite.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const resetTests = () => {
    setTests(prev => prev.map(test => ({ 
      ...test, 
      status: 'pending' as const, 
      message: undefined, 
      duration: undefined 
    })));
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <AlertTriangle className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'outline',
      passed: 'default',
      failed: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status.toUpperCase()}
      </Badge>
    );
  };

  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          OpenAI Integration Test Suite
          <div className="flex gap-2">
            <Button
              onClick={resetTests}
              variant="outline"
              size="sm"
              disabled={isRunning}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={runAllTests}
              disabled={isRunning || !isOpenAIInitialized()}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? "Running..." : "Run Tests"}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Comprehensive tests to verify OpenAI API integration and classification functionality.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isOpenAIInitialized() && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              OpenAI API key not set. Please set your API key before running tests.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {tests.map((test, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <div>
                  <div className="font-medium">{test.name}</div>
                  {test.message && (
                    <div className="text-sm text-muted-foreground">{test.message}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {test.duration && (
                  <span className="text-xs text-muted-foreground">
                    {test.duration}ms
                  </span>
                )}
                {getStatusBadge(test.status)}
              </div>
            </div>
          ))}
        </div>

        {(passedTests > 0 || failedTests > 0) && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Test Summary</div>
            <div className="text-sm text-muted-foreground">
              ✅ {passedTests} passed • ❌ {failedTests} failed • 📊 {tests.length} total
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OpenAITestSuite;
