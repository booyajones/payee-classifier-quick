
import { Calendar } from "lucide-react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";

interface BatchJobTimelineProps {
  job: BatchJob;
}

const BatchJobTimeline = ({ job }: BatchJobTimelineProps) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const calculateDuration = (startTime: number, endTime?: number) => {
    if (!endTime) return null;
    const duration = endTime - startTime;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const completionTime = job.completed_at || job.failed_at || job.expired_at;
  const duration = calculateDuration(job.created_at, completionTime);

  return (
    <div className="bg-muted/50 p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Timeline</span>
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created:</span>
          <span>{formatTimestamp(job.created_at)}</span>
        </div>
        {job.in_progress_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Started:</span>
            <span>{formatTimestamp(job.in_progress_at)}</span>
          </div>
        )}
        {job.finalizing_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Finalizing:</span>
            <span>{formatTimestamp(job.finalizing_at)}</span>
          </div>
        )}
        {completionTime && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {job.completed_at ? 'Completed:' : job.failed_at ? 'Failed:' : 'Expired:'}
            </span>
            <span>{formatTimestamp(completionTime)}</span>
          </div>
        )}
        {duration && (
          <div className="flex justify-between font-medium">
            <span className="text-muted-foreground">Duration:</span>
            <span>{duration}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchJobTimeline;
