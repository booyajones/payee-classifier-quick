
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, DollarSign } from "lucide-react";

interface BatchProcessingModeSelectorProps {
  mode: 'realtime' | 'batch';
  onModeChange: (mode: 'realtime' | 'batch') => void;
  payeeCount?: number;
}

const BatchProcessingModeSelector = ({ 
  mode, 
  onModeChange, 
  payeeCount = 0 
}: BatchProcessingModeSelectorProps) => {
  
  const estimatedCost = {
    realtime: (payeeCount * 0.0001).toFixed(4),
    batch: (payeeCount * 0.00005).toFixed(4)
  };

  const estimatedTime = {
    realtime: Math.ceil(payeeCount / 10) + ' minutes',
    batch: '30 minutes - 24 hours'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Mode</CardTitle>
        <CardDescription>
          Choose how you want to process your batch of {payeeCount} payees
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={mode} onValueChange={onModeChange}>
          <div className="space-y-4">
            {/* Real-time Processing Option */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="realtime" id="realtime" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="realtime" className="text-base font-medium cursor-pointer">
                  Real-time Processing
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Get results immediately as each payee is processed
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    Immediate results
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    ~{estimatedTime.realtime}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    ~${estimatedCost.realtime}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Batch Processing Option */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="batch" id="batch" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="batch" className="text-base font-medium cursor-pointer">
                  Batch Processing (50% Cost Savings)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit job to OpenAI's batch queue for processing within 24 hours
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    ~${estimatedCost.batch} (50% off)
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {estimatedTime.batch}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Asynchronous
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </RadioGroup>

        {payeeCount > 50 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Recommendation:</strong> For {payeeCount} payees, batch processing 
              will save ~${(parseFloat(estimatedCost.realtime) - parseFloat(estimatedCost.batch)).toFixed(4)} 
              and is more efficient for large datasets.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchProcessingModeSelector;
