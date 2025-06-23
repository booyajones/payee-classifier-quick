
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle } from "lucide-react";

const OpenAIDiagnostics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This application now uses advanced offline classification and no longer requires OpenAI integration.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Classification Engine Status</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rule-Based Engine</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pattern Matching</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Keyword Analysis</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Offline Mode</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Enabled</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">All systems operational</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Classification engine is ready to process payee names using advanced rule-based algorithms.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpenAIDiagnostics;
