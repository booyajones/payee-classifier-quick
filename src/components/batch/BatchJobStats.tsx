
import { BatchJob } from "@/lib/openai/trueBatchAPI";

interface BatchJobStatsProps {
  job: BatchJob;
}

const BatchJobStats = ({ job }: BatchJobStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="font-medium">Total Requests:</span> {job.request_counts.total}
      </div>
      <div>
        <span className="font-medium">Completed:</span> {job.request_counts.completed}
      </div>
      <div>
        <span className="font-medium">Failed:</span> {job.request_counts.failed}
      </div>
      <div>
        <span className="font-medium">Progress:</span>{' '}
        {Math.round((job.request_counts.completed / job.request_counts.total) * 100)}%
      </div>
    </div>
  );
};

export default BatchJobStats;
