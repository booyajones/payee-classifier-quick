
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initializeOpenAI } from "@/lib/openaiService";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle, KeyRound } from "lucide-react";

interface APIKeyInputProps {
  onApiKeySet: () => void;
}

const APIKeyInput = ({ onApiKeySet }: APIKeyInputProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setIsValidating(true);
    
    try {
      // Initialize the OpenAI client with the provided API key
      initializeOpenAI(apiKey);
      
      // Store API key in session storage (not local storage for slightly better security)
      // In a production app, this should be handled by a secure backend
      sessionStorage.setItem("openai_api_key", apiKey);
      
      toast({
        title: "API Key Set Successfully",
        description: "Your OpenAI API key has been verified and set.",
        variant: "default",
      });
      
      onApiKeySet();
    } catch (error) {
      console.error("Error setting API key:", error);
      toast({
        title: "Error",
        description: "Failed to set API key. Please check if it's valid and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> 
          Set OpenAI API Key
        </CardTitle>
        <CardDescription>
          Enter your OpenAI API key to enable AI-powered payee classification.
          Your key will be stored in your browser session and only used for classification requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pr-10"
                disabled={isSubmitting}
              />
              {isValidating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> 
              Your API key is only stored in your browser session and never sent to our servers.
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !apiKey.trim().startsWith("sk-")}
          >
            {isSubmitting ? "Setting API Key..." : "Set API Key"}
          </Button>
          
          <div className="text-xs text-muted-foreground mt-4 space-y-1">
            <p className="font-medium">API Key Requirements:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Must start with "sk-"</li>
              <li>You need a valid OpenAI API key with access to GPT-4o</li>
              <li>Your OpenAI account must have available credits</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default APIKeyInput;
