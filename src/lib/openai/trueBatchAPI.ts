import { getOpenAIClient } from './client';
import { makeAPIRequest } from './apiUtils';
import { logger } from '../logger';

export interface BatchJob {
  id: string;
  object: string;
  endpoint: string;
  errors: any;
  input_file_id: string;
  completion_window: string;
  status: 'validating' | 'failed' | 'in_progress' | 'finalizing' | 'completed' | 'expired' | 'cancelled';
  output_file_id: string | null;
  error_file_id: string | null;
  created_at: number;
  in_progress_at?: number;
  expires_at: number;
  finalizing_at?: number;
  completed_at?: number;
  failed_at?: number;
  expired_at?: number;
  cancelling_at?: number;
  cancelled_at?: number;
  request_counts: {
    total: number;
    completed: number;
    failed: number;
  };
  metadata?: {
    description?: string;
    payee_count?: string;
  };
}

export interface BatchResult {
  id: string;
  custom_id: string;
  response?: {
    status_code: number;
    request_id: string;
    body: {
      id: string;
      object: string;
      created: number;
      model: string;
      choices: Array<{
        index: number;
        message: {
          role: string;
          content: string;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ProcessedBatchResult {
  status: 'success' | 'error';
  classification?: 'Business' | 'Individual';
  confidence?: number;
  reasoning?: string;
  error?: string;
}

export async function checkBatchJobStatus(jobId: string): Promise<BatchJob> {
  logger.info(`[BATCH API] Checking status for job: ${jobId}`);
  
  try {
    const openaiClient = await getOpenAIClient();
    if (!openaiClient) {
      throw new Error("OpenAI client not initialized. Please check your API key.");
    }

    const result = await makeAPIRequest(
      () => openaiClient.batches.retrieve(jobId),
      { isStatusCheck: true, retries: 3, retryDelay: 2000 }
    );

    logger.info(`[BATCH API] Job ${jobId} status: ${result.status}`);
    
    // Ensure the result matches our BatchJob interface
    return {
      ...result,
      errors: result.errors || null
    } as BatchJob;
  } catch (error) {
    logger.error(`[BATCH API] Failed to check status for job ${jobId}:`, error);
    throw error;
  }
}

export async function createBatchJob(
  payeeNames: string[],
  description?: string
): Promise<BatchJob> {
  logger.info(`[BATCH API] Creating batch job for ${payeeNames.length} payees`);
  
  try {
    const openaiClient = await getOpenAIClient();
    if (!openaiClient) {
      logger.error("[BATCH API] OpenAI client not initialized");
      throw new Error("OpenAI client not initialized. Please check your API key.");
    }

    logger.info("[BATCH API] OpenAI client ready, creating requests...");

    // Create JSONL content
    const requests = payeeNames.map((name, index) => ({
      custom_id: `payee-${index}`,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at classifying payee names as either 'Business' or 'Individual'. Analyze the given name and provide a classification with confidence level and reasoning."
          },
          {
            role: "user",
            content: `Classify this payee name: "${name}"\n\nRespond with a JSON object containing:\n- classification: "Business" or "Individual"\n- confidence: number from 0-100\n- reasoning: brief explanation for your decision`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 200
      }
    }));

    const jsonlContent = requests.map(req => JSON.stringify(req)).join('\n');
    logger.info(`[BATCH API] Created JSONL content with ${requests.length} requests`);
    
    const blob = new Blob([jsonlContent], { type: 'application/json' });
    const file = new File([blob], 'batch_requests.jsonl', { type: 'application/json' });

    logger.info("[BATCH API] Uploading file to OpenAI...");
    
    // Upload file with retry
    const uploadedFile = await makeAPIRequest(
      () => openaiClient.files.create({
        file: file,
        purpose: 'batch'
      }),
      { retries: 2, retryDelay: 3000 }
    );

    logger.info(`[BATCH API] File uploaded successfully: ${uploadedFile.id}`);

    // Create batch job with retry
    logger.info("[BATCH API] Creating batch job...");
    const result = await makeAPIRequest(
      () => openaiClient.batches.create({
        input_file_id: uploadedFile.id,
        endpoint: '/v1/chat/completions',
        completion_window: '24h',
        metadata: {
          description: description || `Payee classification batch: ${payeeNames.length} payees`,
          payee_count: payeeNames.length.toString()
        }
      }),
      { retries: 2, retryDelay: 3000 }
    );

    logger.info(`[BATCH API] Batch job created successfully: ${result.id}`);
    
    // Ensure the result matches our BatchJob interface
    return {
      ...result,
      errors: result.errors || null
    } as BatchJob;
  } catch (error) {
    logger.error(`[BATCH API] Failed to create batch job:`, error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error("API quota exceeded. Please try again later or check your OpenAI usage limits.");
      }
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        throw new Error("Authentication failed. Please check your OpenAI API key.");
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error("Network error. Please check your internet connection and try again.");
      }
    }
    
    throw new Error(`Failed to create batch job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download and parse the results for a completed batch job.
 *
 * Throws "Batch job is not completed" if the job has not finished, or
 * "Batch job has no output file" if the output file id is missing.
 */
export async function getBatchJobResults(
  job: BatchJob,
  payeeNames: string[]
): Promise<ProcessedBatchResult[]> {
  logger.info(`[BATCH API] Getting results for job: ${job.id}`);

  if (job.status !== 'completed') {
    throw new Error('Batch job is not completed');
  }

  if (!job.output_file_id) {
    throw new Error('Batch job has no output file');
  }

  const openaiClient = await getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

  // Download results with retry
  const fileContent = await makeAPIRequest(
    () => openaiClient.files.content(job.output_file_id!),
    { retries: 3, retryDelay: 2000 }
  );

  const text = await fileContent.text();
  const lines = text.trim().split('\n').filter(line => line.trim());
  
  logger.info(`[BATCH API] Downloaded ${lines.length} result lines`);
  
  const results: ProcessedBatchResult[] = new Array(payeeNames.length).fill(null);
  
  for (const line of lines) {
    try {
      const result: BatchResult = JSON.parse(line);
      const customId = result.custom_id;
      const index = parseInt(customId.replace('payee-', ''));
      
      if (index >= 0 && index < payeeNames.length) {
        if (result.response?.body?.choices?.[0]?.message?.content) {
          try {
            const content = JSON.parse(result.response.body.choices[0].message.content);
            results[index] = {
              status: 'success',
              classification: content.classification,
              confidence: content.confidence,
              reasoning: content.reasoning
            };
          } catch (parseError) {
            logger.error(`[BATCH API] Failed to parse response for ${customId}:`, parseError);
            results[index] = {
              status: 'error',
              error: 'Failed to parse classification result'
            };
          }
        } else if (result.error) {
          results[index] = {
            status: 'error',
            error: result.error.message
          };
        } else {
          results[index] = {
            status: 'error',
            error: 'No response data'
          };
        }
      }
    } catch (error) {
      logger.error('[BATCH API] Failed to parse result line:', error);
    }
  }
  
  // Fill any null results with error status
  for (let i = 0; i < results.length; i++) {
    if (!results[i]) {
      results[i] = {
        status: 'error',
        error: 'No result found'
      };
    }
  }
  
  logger.info(`[BATCH API] Processed ${results.length} results`);
  return results;
}

export async function cancelBatchJob(jobId: string): Promise<BatchJob> {
  logger.info(`[BATCH API] Cancelling job: ${jobId}`);
  
  const openaiClient = await getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

  const result = await makeAPIRequest(
    () => openaiClient.batches.cancel(jobId),
    { retries: 2, retryDelay: 2000 }
  );

  // Ensure the result matches our BatchJob interface
  return {
    ...result,
    errors: result.errors || null
  } as BatchJob;
}
