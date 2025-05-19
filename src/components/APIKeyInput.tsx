
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initializeOpenAI } from "@/lib/openaiService";
import { useToast } from "@/components/ui/use-toast";

interface APIKeyInputProps {
  onApiKeySet: () => void;
}

const APIKeyInput = ({ onApiKeySet }: APIKeyInputProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
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
    
    try {
      // Initialize the OpenAI client with the provided API key
      initializeOpenAI(apiKey);
      
      // Store API key in session storage (not local storage for slightly better security)
      // In a production app, this should be handled by a secure backend
      sessionStorage.setItem("openai_api_key", apiKey);
      
      toast({
        title: "API Key Set",
        description: "Your OpenAI API key has been successfully set.",
      });
      
      onApiKeySet();
    } catch (error) {
      console.error("Error setting API key:", error);
      toast({
        title: "Error",
        description: "Failed to set API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Set OpenAI API Key</CardTitle>
        <CardDescription>
          Enter your OpenAI API key to enable AI-powered payee classification.
          Your key will be stored in your browser session and only used for classification requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your API key is only stored in your browser session and never sent to our servers.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Setting API Key..." : "Set API Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default APIKeyInput;
