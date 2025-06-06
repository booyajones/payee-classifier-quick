
import { BatchJob } from './openai/trueBatchAPI';

class ChatService {
  async processQuery(query: string): Promise<string> {
    const normalizedQuery = query.toLowerCase();

    // Job status queries
    if (normalizedQuery.includes('job') && (normalizedQuery.includes('status') || normalizedQuery.includes('check'))) {
      return this.handleJobStatusQuery(query);
    }

    // Active jobs
    if (normalizedQuery.includes('active') && normalizedQuery.includes('job')) {
      return this.getActiveJobs();
    }

    // Recent results
    if (normalizedQuery.includes('recent') && normalizedQuery.includes('result')) {
      return this.getRecentResults();
    }

    // Help queries
    if (normalizedQuery.includes('help') || normalizedQuery.includes('how')) {
      return this.getHelp(normalizedQuery);
    }

    // Statistics
    if (normalizedQuery.includes('statistic') || normalizedQuery.includes('summary')) {
      return this.getStatistics();
    }

    // Default response
    return this.getDefaultResponse(query);
  }

  private handleJobStatusQuery(query: string): string {
    try {
      const jobs = this.getStoredJobs();
      
      // Extract job ID from query
      const jobIdMatch = query.match(/[a-f0-9]{8,}/i);
      if (jobIdMatch) {
        const jobId = jobIdMatch[0];
        const job = jobs.find(j => j.id.includes(jobId));
        
        if (job) {
          return this.formatJobStatus(job);
        } else {
          return `Job with ID containing "${jobId}" not found. Available jobs: ${jobs.map(j => j.id.slice(-8)).join(', ')}`;
        }
      }

      // No specific ID, show all jobs
      if (jobs.length === 0) {
        return "No batch jobs found in storage.";
      }

      return jobs.map(job => this.formatJobStatus(job)).join('\n\n');
    } catch (error) {
      return "Error accessing job data. Please check if you have any active jobs.";
    }
  }

  private getActiveJobs(): string {
    try {
      const jobs = this.getStoredJobs();
      const activeJobs = jobs.filter(job => 
        ['validating', 'in_progress', 'finalizing'].includes(job.status)
      );

      if (activeJobs.length === 0) {
        return "No active jobs found. All jobs are either completed, failed, or cancelled.";
      }

      return `Found ${activeJobs.length} active job(s):\n\n` + 
        activeJobs.map(job => this.formatJobStatus(job)).join('\n\n');
    } catch (error) {
      return "Error checking active jobs.";
    }
  }

  private getRecentResults(): string {
    try {
      const jobs = this.getStoredJobs();
      const completedJobs = jobs
        .filter(job => job.status === 'completed')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

      if (completedJobs.length === 0) {
        return "No completed jobs found yet.";
      }

      return `Recent completed jobs:\n\n` + 
        completedJobs.map(job => 
          `Job ${job.id.slice(-8)}: Completed ${new Date(job.completed_at || job.created_at).toLocaleString()}`
        ).join('\n');
    } catch (error) {
      return "Error accessing recent results.";
    }
  }

  private getHelp(query: string): string {
    if (query.includes('upload') || query.includes('file')) {
      return `To upload a file for classification:
1. Go to the "File Processing" tab
2. Click "Choose File" and select your CSV/Excel file
3. Map the payee name column
4. Configure classification settings
5. Click "Start Processing"

Supported formats: CSV, Excel (.xlsx, .xls)
Required: At least one column with payee names`;
    }

    if (query.includes('keyword')) {
      return `Keyword management:
1. Go to "Keyword Management" tab
2. Add keywords that should exclude payees from classification
3. Keywords are matched against payee names
4. Excluded payees are automatically classified as "Individual"

This helps filter out obvious individual payees before AI processing.`;
    }

    return `I can help you with:
• Job status: "What's the status of job [ID]?"
• Active jobs: "Show me active jobs"
• Recent results: "Show me recent results"
• File upload: "How do I upload a file?"
• Keyword management: "How do keywords work?"
• Statistics: "Show me statistics"

Just ask me anything about the classification system!`;
  }

  private getStatistics(): string {
    try {
      const jobs = this.getStoredJobs();
      const completed = jobs.filter(j => j.status === 'completed').length;
      const active = jobs.filter(j => ['validating', 'in_progress', 'finalizing'].includes(j.status)).length;
      const failed = jobs.filter(j => j.status === 'failed').length;

      return `System Statistics:
• Total jobs: ${jobs.length}
• Completed: ${completed}
• Active: ${active}
• Failed: ${failed}
• Success rate: ${jobs.length > 0 ? Math.round((completed / jobs.length) * 100) : 0}%`;
    } catch (error) {
      return "Error calculating statistics.";
    }
  }

  private getDefaultResponse(query: string): string {
    return `I understand you're asking about: "${query}"

I can help you with job statuses, system information, and usage guidance. Try asking:
• "What jobs are active?"
• "Show me recent results"
• "How do I upload a file?"
• "Show me statistics"

What would you like to know more about?`;
  }

  private getStoredJobs(): BatchJob[] {
    try {
      const stored = localStorage.getItem('batch_classification_jobs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private formatJobStatus(job: BatchJob): string {
    const shortId = job.id.slice(-8);
    const status = job.status.charAt(0).toUpperCase() + job.status.slice(1);
    const created = new Date(job.created_at).toLocaleString();
    
    let progress = '';
    if (job.request_counts) {
      const { total, completed, failed } = job.request_counts;
      progress = `\nProgress: ${completed}/${total} completed`;
      if (failed > 0) progress += `, ${failed} failed`;
    }

    return `Job ${shortId}:
Status: ${status}
Created: ${created}${progress}`;
  }
}

export const chatService = new ChatService();
