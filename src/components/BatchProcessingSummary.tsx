
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BatchProcessingResult } from "@/lib/types";

interface BatchProcessingSummaryProps {
  summary: BatchProcessingResult;
}

const BatchProcessingSummary = ({ summary }: BatchProcessingSummaryProps) => {
  const { successCount, failureCount, processingTime } = summary;
  const totalProcessed = successCount + failureCount;
  
  // Calculate classification distribution with null checks
  const businessCount = summary.results.filter(
    result => result && result.result && result.result.classification === 'Business'
  ).length;
  
  const individualCount = summary.results.filter(
    result => result && result.result && result.result.classification === 'Individual'
  ).length;
  
  const businessPercentage = totalProcessed > 0
    ? Math.round((businessCount / totalProcessed) * 100)
    : 0;
  
  const individualPercentage = totalProcessed > 0
    ? Math.round((individualCount / totalProcessed) * 100)
    : 0;
  
  // Calculate tier distribution with null checks
  const tierCounts = summary.results.reduce((acc, result) => {
    if (result && result.result && result.result.processingTier) {
      const tier = result.result.processingTier;
      acc[tier] = (acc[tier] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Batch Processing Summary</CardTitle>
        <CardDescription>
          Summary statistics for the batch processing job.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-background border rounded-lg">
            <div className="text-sm text-muted-foreground">Total Processed</div>
            <div className="text-2xl font-bold">{totalProcessed}</div>
          </div>
          
          <div className="p-4 bg-background border rounded-lg">
            <div className="text-sm text-muted-foreground">Processing Time</div>
            <div className="text-2xl font-bold">{processingTime}s</div>
          </div>
          
          <div className="p-4 bg-background border rounded-lg">
            <div className="text-sm text-muted-foreground">Businesses</div>
            <div className="text-2xl font-bold">{businessCount} <span className="text-sm font-normal text-muted-foreground">({businessPercentage}%)</span></div>
          </div>
          
          <div className="p-4 bg-background border rounded-lg">
            <div className="text-sm text-muted-foreground">Individuals</div>
            <div className="text-2xl font-bold">{individualCount} <span className="text-sm font-normal text-muted-foreground">({individualPercentage}%)</span></div>
          </div>
        </div>
        
        {/* Processing tier breakdown */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Processing Tier Distribution</h4>
          <div className="space-y-2">
            {Object.entries(tierCounts).map(([tier, count]) => {
              const percentage = Math.round((count / totalProcessed) * 100);
              return (
                <div key={tier} className="flex items-center gap-2">
                  <div className="text-sm font-medium w-24">{tier}:</div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground w-16">{count} ({percentage}%)</div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchProcessingSummary;
