
// Offline batch job types - no OpenAI dependency
export interface BatchJob {
  id: string;
  status: 'validating' | 'in_progress' | 'finalizing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  created_at: number;
  in_progress_at?: number;
  finalizing_at?: number;
  completed_at?: number;
  failed_at?: number;
  expired_at?: number;
  request_counts: {
    total: number;
    completed: number;
    failed: number;
  };
  metadata?: {
    description?: string;
  };
  errors?: any[];
}

// Mock batch job functions for offline operation
export function createMockBatchJob(payeeNames: string[], description?: string): BatchJob {
  const jobId = `batch_offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: jobId,
    status: 'completed', // Immediately mark as completed for offline processing
    created_at: Math.floor(Date.now() / 1000),
    completed_at: Math.floor(Date.now() / 1000),
    request_counts: {
      total: payeeNames.length,
      completed: payeeNames.length,
      failed: 0
    },
    metadata: {
      description: description || `Offline classification of ${payeeNames.length} payees`
    }
  };
}

export function checkBatchJobStatus(jobId: string): Promise<BatchJob> {
  // For offline mode, just return a mock completed status
  return Promise.resolve({
    id: jobId,
    status: 'completed',
    created_at: Math.floor(Date.now() / 1000),
    completed_at: Math.floor(Date.now() / 1000),
    request_counts: {
      total: 0,
      completed: 0,
      failed: 0
    }
  });
}

export function cancelBatchJob(jobId: string): Promise<BatchJob> {
  return Promise.resolve({
    id: jobId,
    status: 'cancelled',
    created_at: Math.floor(Date.now() / 1000),
    request_counts: {
      total: 0,
      completed: 0,
      failed: 0
    }
  });
}

export function getBatchJobResults(job: any, payeeNames: string[], originalRowIndexes: number[]): Promise<any[]> {
  // Return mock results for offline processing
  return Promise.resolve(payeeNames.map((name, index) => ({
    status: 'success',
    classification: 'Individual',
    confidence: 75,
    reasoning: 'Offline rule-based classification'
  })));
}
