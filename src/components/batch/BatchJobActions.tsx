
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Trash, Loader2 } from "lucide-react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";

interface BatchJobActionsProps {
  job: BatchJob;
  isRefreshing: boolean;
  isDownloading: boolean;
  onManualRefresh: (jobId: string) => void;
  onDownloadResults: (job: BatchJob) => void;
  onCancelJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
}

const BatchJobActions = ({
  job,
  isRefreshing,
  isDownloading,
  onManualRefresh,
  onDownloadResults,
  onCancelJob,
  onDeleteJob
}: BatchJobActionsProps) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {/* Manual Refresh Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onManualRefresh(job.id)}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3 mr-1" />
        )}
        {isRefreshing ? 'Checking...' : 'Check Status'}
      </Button>

      {job.status === 'completed' && (
        <Button
          size="sm"
          onClick={() => onDownloadResults(job)}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Download className="h-3 w-3 mr-1" />
          )}
          {isDownloading ? 'Downloading...' : 'Download Results'}
        </Button>
      )}

      {['validating', 'in_progress'].includes(job.status) && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onCancelJob(job.id)}
        >
          Cancel Job
        </Button>
      )}

      {['completed', 'failed', 'expired', 'cancelled'].includes(job.status) && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDeleteJob(job.id)}
        >
          <Trash className="h-3 w-3 mr-1" />
          Remove
        </Button>
      )}
    </div>
  );
};

export default BatchJobActions;
