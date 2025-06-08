
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, Zap } from "lucide-react";

export type ProcessingMode = 'direct' | 'batch';

interface ProcessingModeSelectorProps {
  mode: ProcessingMode;
  onModeChange: (mode: ProcessingMode) => void;
  disabled?: boolean;
}

const ProcessingModeSelector = ({ mode, onModeChange, disabled = false }: ProcessingModeSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Processing Mode</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as ProcessingMode)}
          disabled={disabled}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="direct" id="direct" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="direct" className="flex items-center gap-2 font-medium cursor-pointer">
                <Zap className="h-4 w-4 text-blue-500" />
                Direct
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Fast processing
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="batch" id="batch" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="batch" className="flex items-center gap-2 font-medium cursor-pointer">
                <Clock className="h-4 w-4 text-orange-500" />
                Batch
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Trackable batch job
              </p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default ProcessingModeSelector;
