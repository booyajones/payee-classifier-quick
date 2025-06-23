
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Info } from "lucide-react";

interface APIKeyInputProps {
  onApiKeySet: () => void;
  onApiKeyChange?: () => void;
}

const APIKeyInput = ({ onApiKeySet }: APIKeyInputProps) => {
  // Since we're not using OpenAI anymore, we can skip directly to the main app
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Ready to Use
        </CardTitle>
        <CardDescription>
          The payee classification system is ready to use with offline rule-based classification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            This application now uses advanced rule-based classification that works entirely offline without requiring any API keys.
          </AlertDescription>
        </Alert>
        
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium">Classification system is active</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          The V3 classification engine uses sophisticated pattern matching, keyword analysis, and rule-based logic to accurately classify payee names.
        </p>
        
        <button 
          onClick={onApiKeySet}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium"
        >
          Continue to Classification
        </button>
      </CardContent>
    </Card>
  );
};

export default APIKeyInput;
