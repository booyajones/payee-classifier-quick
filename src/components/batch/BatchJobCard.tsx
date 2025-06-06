
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import BatchJobTimeline from "./BatchJobTimeline";
import BatchJobStats from "./BatchJobStats";
import BatchJobActions from "./BatchJobActions";

interface PollingState {
  isPolling: boolean;
  pollCount: number;
  lastError?: string;
  lastSuccessfulPoll?: number;
  isRateLimited?: boolean;
  consecutiveFailures?: number;
}

interface BatchJobCardProps {
  job: BatchJob;
  pollingState?: PollingState;
  payeeCount: number;
  isRefreshing: boolean;
  isDownloading: boolean;
  onManualRefresh: (jobId: string) => void;
  onDownloadResults: (job: BatchJob) => void;
  onCancelJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
}

const BatchJobCard = ({
  job,
  pollingState,
  payeeCount,
  isRefreshing,
  isDownloading,
  onManualRefresh,
  onDownloadResults,
  onCancelJob,
  onDeleteJob
}: BatchJobCardProps) => {
  const formatLastPollTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) return `${minutes}m ${seconds}s ago`;
    return `${seconds}s ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'expired':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'expired':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">
              Job {job.id.slice(-8)}
              {pollingState?.isPolling && (
                <span className="ml-2 text-xs text-blue-600">
                  (Auto-checking every minute)
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {job.metadata?.description || 'Payee classification batch'} • {payeeCount} payees
            </CardDescription>
            {pollingState?.lastError && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <p className="text-xs text-red-600">
                  {pollingState.lastError}
                </p>
              </div>
            )}
            {pollingState?.lastSuccessfulPoll && (
              <p className="text-xs text-muted-foreground mt-1">
                Last checked: {formatLastPollTime(pollingState.lastSuccessfulPoll)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            <Badge className={getStatusColor(job.status)}>
              {job.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <BatchJobTimeline job={job} />
        <BatchJobStats job={job} />
        <BatchJobActions
          job={job}
          isRefreshing={isRefreshing}
          isDownloading={isDownloading}
          onManualRefresh={onManualRefresh}
          onDownloadResults={onDownloadResults}
          onCancelJob={onCancelJob}
          onDeleteJob={onDeleteJob}
        />
      </CardContent>
    </Card>
  );
};

export default BatchJobCard;
