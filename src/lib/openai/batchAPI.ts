
import { getOpenAIClient } from './client';

export interface BatchJobRequest {
  custom_id: string;
  method: string;
  url: string;
  body: {
    model: string;
    messages: Array<{
      role: string;
      content: string;
    }>;
    temperature: number;
    max_tokens: number;
  };
}

export interface BatchClassificationRequest {
  payeeNames: string[];
  onProgress?: (status: string, progress: number) => void;
}

export interface BatchClassificationResult {
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Create batch requests for payee classification
 */
function createBatchRequests(payeeNames: string[]): BatchJobRequest[] {
  return payeeNames.map((name, index) => ({
    custom_id: `payee-${index}-${Date.now()}`,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at classifying payee names. Classify each name as either "Business" or "Individual". Return only a JSON object with classification, confidence (0-100), and reasoning.'
        },
        {
          role: 'user',
          content: `Classify this payee name: "${name}"\n\nReturn ONLY a JSON object like: {"classification": "Business", "confidence": 95, "reasoning": "Contains LLC suffix indicating business entity"}`
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    }
  }));
}

/**
 * Upload batch file to OpenAI
 */
async function uploadBatchFile(batchRequests: BatchJobRequest[]): Promise<string> {
  const client = getOpenAIClient();
  
  // Convert batch requests to JSONL format
  const jsonlContent = batchRequests
    .map(request => JSON.stringify(request))
    .join('\n');
  
  // Create a blob from the JSONL content
  const blob = new Blob([jsonlContent], { type: 'application/json' });
  const file = new File([blob], `batch-${Date.now()}.jsonl`, { type: 'application/json' });
  
  console.log(`[BATCH API] Uploading batch file with ${batchRequests.length} requests`);
  
  const fileUpload = await client.files.create({
    file: file,
    purpose: 'batch'
  });
  
  console.log(`[BATCH API] File uploaded successfully: ${fileUpload.id}`);
  return fileUpload.id;
}

/**
 * Create a batch job
 */
async function createBatchJob(fileId: string): Promise<string> {
  const client = getOpenAIClient();
  
  console.log(`[BATCH API] Creating batch job for file: ${fileId}`);
  
  const batch = await client.batches.create({
    input_file_id: fileId,
    endpoint: '/v1/chat/completions',
    completion_window: '24h'
  });
  
  console.log(`[BATCH API] Batch job created: ${batch.id}`);
  return batch.id;
}

/**
 * Check batch job status
 */
async function checkBatchStatus(batchId: string) {
  const client = getOpenAIClient();
  
  const batch = await client.batches.retrieve(batchId);
  console.log(`[BATCH API] Batch ${batchId} status: ${batch.status}`);
  
  return {
    status: batch.status,
    completedAt: batch.completed_at,
    failedAt: batch.failed_at,
    outputFileId: batch.output_file_id,
    errorFileId: batch.error_file_id,
    requestCounts: batch.request_counts
  };
}

/**
 * Download and parse batch results
 */
async function downloadBatchResults(fileId: string, payeeNames: string[]): Promise<BatchClassificationResult[]> {
  const client = getOpenAIClient();
  
  console.log(`[BATCH API] Downloading results from file: ${fileId}`);
  
  const fileContent = await client.files.content(fileId);
  const text = await fileContent.text();
  
  const results: BatchClassificationResult[] = [];
  const lines = text.trim().split('\n');
  
  for (const line of lines) {
    try {
      const result = JSON.parse(line);
      const customId = result.custom_id;
      const response = result.response;
      
      // Extract payee index from custom_id
      const indexMatch = customId.match(/payee-(\d+)-/);
      if (!indexMatch) continue;
      
      const payeeIndex = parseInt(indexMatch[1]);
      const payeeName = payeeNames[payeeIndex];
      
      if (!payeeName) continue;
      
      if (response.body.choices && response.body.choices[0]) {
        const content = response.body.choices[0].message.content;
        const parsed = JSON.parse(content);
        
        results.push({
          payeeName,
          classification: parsed.classification || 'Individual',
          confidence: parsed.confidence || 50,
          reasoning: parsed.reasoning || 'Processed via OpenAI Batch API',
          status: 'success'
        });
      } else {
        results.push({
          payeeName,
          classification: 'Individual',
          confidence: 0,
          reasoning: 'No valid response from batch processing',
          status: 'failed'
        });
      }
    } catch (error) {
      console.error(`[BATCH API] Error parsing result line:`, error);
    }
  }
  
  return results;
}

/**
 * Wait for batch completion with polling
 */
async function waitForBatchCompletion(
  batchId: string, 
  onProgress?: (status: string, progress: number) => void,
  maxWaitTime: number = 30 * 60 * 1000 // 30 minutes default
): Promise<{ status: string; outputFileId?: string; errorFileId?: string }> {
  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds
  
  while (Date.now() - startTime < maxWaitTime) {
    const batchStatus = await checkBatchStatus(batchId);
    
    if (onProgress) {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / maxWaitTime) * 100, 95);
      onProgress(`Batch status: ${batchStatus.status}`, progress);
    }
    
    if (batchStatus.status === 'completed') {
      return {
        status: 'completed',
        outputFileId: batchStatus.outputFileId || undefined
      };
    }
    
    if (batchStatus.status === 'failed' || batchStatus.status === 'cancelled') {
      return {
        status: batchStatus.status,
        errorFileId: batchStatus.errorFileId || undefined
      };
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  return { status: 'timeout' };
}

/**
 * Process batch classification using OpenAI Batch API
 */
export async function processBatchClassification({
  payeeNames,
  onProgress
}: BatchClassificationRequest): Promise<BatchClassificationResult[]> {
  if (!payeeNames.length) {
    return [];
  }

  console.log(`[BATCH API] Starting batch classification for ${payeeNames.length} payees`);
  
  try {
    onProgress?.('Creating batch requests...', 10);
    
    // Create batch requests
    const batchRequests = createBatchRequests(payeeNames);
    
    onProgress?.('Uploading batch file...', 20);
    
    // Upload batch file
    const fileId = await uploadBatchFile(batchRequests);
    
    onProgress?.('Creating batch job...', 30);
    
    // Create batch job
    const batchId = await createBatchJob(fileId);
    
    onProgress?.('Waiting for batch completion...', 40);
    
    // Wait for completion
    const completion = await waitForBatchCompletion(batchId, (status, progress) => {
      onProgress?.(status, 40 + (progress * 0.5)); // 40-90% range
    });
    
    if (completion.status !== 'completed' || !completion.outputFileId) {
      throw new Error(`Batch processing ${completion.status}`);
    }
    
    onProgress?.('Downloading results...', 90);
    
    // Download and parse results
    const results = await downloadBatchResults(completion.outputFileId, payeeNames);
    
    onProgress?.('Batch processing complete', 100);
    console.log(`[BATCH API] Completed batch classification: ${results.length} results`);
    
    return results;

  } catch (error) {
    console.error('[BATCH API] Batch processing failed:', error);
    
    // Return fallback results
    return payeeNames.map(name => ({
      payeeName: name,
      classification: 'Individual' as const,
      confidence: 0,
      reasoning: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}
