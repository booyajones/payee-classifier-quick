
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

export interface BatchJobResponse {
  id: string;
  object: string;
  endpoint: string;
  errors?: any;
  input_file_id: string;
  completion_window: string;
  status: 'validating' | 'failed' | 'in_progress' | 'finalizing' | 'completed' | 'expired' | 'cancelling' | 'cancelled';
  output_file_id?: string;
  error_file_id?: string;
  created_at: number;
  in_progress_at?: number;
  expires_at: number;
  finalizing_at?: number;
  completed_at?: number;
  failed_at?: number;
  expired_at?: number;
  cancelled_at?: number;
  request_counts: {
    total: number;
    completed: number;
    failed: number;
  };
  metadata?: any;
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
async function uploadBatchFile(requests: BatchJobRequest[]): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  // Convert requests to JSONL format
  const jsonlContent = requests.map(req => JSON.stringify(req)).join('\n');
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
  
  // Create a File object from the blob
  const file = new File([blob], 'batch_requests.jsonl', { type: 'application/jsonl' });

  try {
    const fileResponse = await client.files.create({
      file: file,
      purpose: 'batch'
    });

    console.log('[BATCH API] File uploaded:', fileResponse.id);
    return fileResponse.id;
  } catch (error) {
    console.error('[BATCH API] File upload failed:', error);
    throw new Error(`Failed to upload batch file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a batch job
 */
async function createBatchJob(inputFileId: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const batchResponse = await client.batches.create({
      input_file_id: inputFileId,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
      metadata: {
        description: 'Payee classification batch job'
      }
    });

    console.log('[BATCH API] Batch job created:', batchResponse.id);
    return batchResponse.id;
  } catch (error) {
    console.error('[BATCH API] Batch job creation failed:', error);
    throw new Error(`Failed to create batch job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check batch job status
 */
async function checkBatchStatus(batchId: string): Promise<BatchJobResponse> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const batch = await client.batches.retrieve(batchId);
    return batch as BatchJobResponse;
  } catch (error) {
    console.error('[BATCH API] Status check failed:', error);
    throw new Error(`Failed to check batch status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download and parse batch results
 */
async function downloadBatchResults(outputFileId: string): Promise<any[]> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const fileResponse = await client.files.content(outputFileId);
    const content = await fileResponse.text();
    
    // Parse JSONL response
    const lines = content.trim().split('\n');
    return lines.map(line => JSON.parse(line));
  } catch (error) {
    console.error('[BATCH API] Result download failed:', error);
    throw new Error(`Failed to download batch results: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
    // Step 1: Create batch requests
    onProgress?.('Creating batch requests...', 10);
    const requests = createBatchRequests(payeeNames);

    // Step 2: Upload batch file
    onProgress?.('Uploading batch file...', 20);
    const inputFileId = await uploadBatchFile(requests);

    // Step 3: Create batch job
    onProgress?.('Creating batch job...', 30);
    const batchId = await createBatchJob(inputFileId);

    // Step 4: Wait for completion
    onProgress?.('Waiting for batch processing...', 40);
    let batchStatus: BatchJobResponse;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max wait
    
    do {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      batchStatus = await checkBatchStatus(batchId);
      attempts++;
      
      const progress = Math.min(90, 40 + (attempts / maxAttempts) * 50);
      onProgress?.(`Batch status: ${batchStatus.status}`, progress);
      
      console.log(`[BATCH API] Status check ${attempts}: ${batchStatus.status}`);
      
      if (attempts >= maxAttempts) {
        throw new Error('Batch job timeout - taking longer than expected');
      }
      
    } while (!['completed', 'failed', 'expired', 'cancelled'].includes(batchStatus.status));

    if (batchStatus.status !== 'completed') {
      throw new Error(`Batch job failed with status: ${batchStatus.status}`);
    }

    // Step 5: Download results
    onProgress?.('Downloading results...', 95);
    if (!batchStatus.output_file_id) {
      throw new Error('No output file ID in completed batch');
    }

    const rawResults = await downloadBatchResults(batchStatus.output_file_id);
    
    // Step 6: Process and format results
    onProgress?.('Processing results...', 100);
    const results: BatchClassificationResult[] = [];
    
    for (let i = 0; i < payeeNames.length; i++) {
      const payeeName = payeeNames[i];
      const rawResult = rawResults.find(r => r.custom_id === `payee-${i}-${requests[0].custom_id.split('-')[2]}`);
      
      if (rawResult && rawResult.response && rawResult.response.body && rawResult.response.body.choices) {
        try {
          const content = rawResult.response.body.choices[0].message.content;
          const parsed = JSON.parse(content);
          
          results.push({
            payeeName,
            classification: parsed.classification || 'Individual',
            confidence: parsed.confidence || 50,
            reasoning: parsed.reasoning || 'Processed via OpenAI Batch API',
            status: 'success'
          });
        } catch (parseError) {
          console.error(`[BATCH API] Failed to parse result for ${payeeName}:`, parseError);
          results.push({
            payeeName,
            classification: 'Individual',
            confidence: 0,
            reasoning: 'Failed to parse AI response',
            status: 'failed',
            error: parseError instanceof Error ? parseError.message : 'Parse error'
          });
        }
      } else {
        results.push({
          payeeName,
          classification: 'Individual',
          confidence: 0,
          reasoning: 'No result from batch processing',
          status: 'failed',
          error: 'Missing result'
        });
      }
    }

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

/**
 * Cancel a batch job if needed
 */
export async function cancelBatchJob(batchId: string): Promise<void> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    await client.batches.cancel(batchId);
    console.log('[BATCH API] Batch job cancelled:', batchId);
  } catch (error) {
    console.error('[BATCH API] Failed to cancel batch job:', error);
    throw error;
  }
}
