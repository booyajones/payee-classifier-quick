
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initializeOpenAI, hasSavedOpenAIKey, clearOpenAIKeys } from "@/lib/openai/client";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle, KeyRound, Save, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface APIKeyInputProps {
  onApiKeySet: () => void;
}

const APIKeyInput = ({ onApiKeySet }: APIKeyInputProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [rememberKey, setRememberKey] = useState(true);
  const [keyIsSaved, setKeyIsSaved] = useState(false);
  const { toast } = useToast();

  // Check if API key is already set in storage on component mount
  useEffect(() => {
    const checkSavedKey = () => {
      const hasSavedKey = hasSavedOpenAIKey();
      setKeyIsSaved(hasSavedKey);
      
      if (hasSavedKey) {
        onApiKeySet();
      }
    };
    
    checkSavedKey();
  }, [onApiKeySet]);

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
      initializeOpenAI(apiKey, rememberKey);
      
      toast({
        title: "API Key Set Successfully",
        description: rememberKey ? 
          "Your OpenAI API key has been securely saved and will be remembered for future sessions." : 
          "Your OpenAI API key has been set for this session only.",
        variant: "default",
      });
      
      setKeyIsSaved(true);
      setApiKey(""); // Clear input for security
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

  const handleClearSavedKey = () => {
    clearOpenAIKeys();
    setKeyIsSaved(false);
    toast({
      title: "API Key Removed",
      description: "Your saved API key has been removed.",
      variant: "default",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> 
          {keyIsSaved ? "API Key Saved" : "Set OpenAI API Key"}
        </CardTitle>
        <CardDescription>
          {keyIsSaved ? 
            "You already have an API key saved. You can use it or set a new one." : 
            "Enter your OpenAI API key to enable AI-powered payee classification."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {keyIsSaved ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">API key is saved and active</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearSavedKey}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              You can continue using the saved API key or set a new one below.
            </p>
          </div>
        ) : null}
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
              Your API key is securely stored and only used for classification requests.
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="remember-key" 
              checked={rememberKey}
              onCheckedChange={setRememberKey}
            />
            <Label htmlFor="remember-key">
              Remember this API key for future sessions
            </Label>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !apiKey.trim().startsWith("sk-")}
          >
            {isSubmitting ? "Setting API Key..." : keyIsSaved ? "Update API Key" : "Set API Key"}
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
