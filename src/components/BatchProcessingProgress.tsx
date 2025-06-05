
import { Progress } from "@/components/ui/progress";

interface BatchProcessingProgressProps {
  progress: number;
  status: string;
}

const BatchProcessingProgress = ({ progress, status }: BatchProcessingProgressProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{status}</span>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

export default BatchProcessingProgress;
