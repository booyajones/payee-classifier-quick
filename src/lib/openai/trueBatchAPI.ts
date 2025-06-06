import { getOpenAIClient } from './client';
import { makeAPIRequest } from './apiUtils';

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
  console.log(`[BATCH API] Checking status for job: ${jobId}`);
  
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

  const result = await makeAPIRequest(
    () => openaiClient.batches.retrieve(jobId),
    { isStatusCheck: true, retries: 3, retryDelay: 2000 }
  );

  // Ensure the result matches our BatchJob interface
  return {
    ...result,
    errors: result.errors || null
  } as BatchJob;
}

export async function createBatchJob(
  payeeNames: string[],
  description?: string
): Promise<BatchJob> {
  console.log(`[BATCH API] Creating batch job for ${payeeNames.length} payees`);
  
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

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
  const blob = new Blob([jsonlContent], { type: 'application/json' });
  const file = new File([blob], 'batch_requests.jsonl', { type: 'application/json' });

  // Upload file with retry
  const uploadedFile = await makeAPIRequest(
    () => openaiClient.files.create({
      file: file,
      purpose: 'batch'
    }),
    { retries: 2, retryDelay: 3000 }
  );

  console.log(`[BATCH API] File uploaded: ${uploadedFile.id}`);

  // Create batch job with retry
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

  console.log(`[BATCH API] Batch job created: ${result.id}`);
  
  // Ensure the result matches our BatchJob interface
  return {
    ...result,
    errors: result.errors || null
  } as BatchJob;
}

export async function getBatchJobResults(
  job: BatchJob,
  payeeNames: string[]
): Promise<ProcessedBatchResult[]> {
  console.log(`[BATCH API] Getting results for job: ${job.id}`);
  
  if (!job.output_file_id) {
    throw new Error('Batch job has no output file');
  }

  const openaiClient = getOpenAIClient();
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
  
  console.log(`[BATCH API] Downloaded ${lines.length} result lines`);
  
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
            console.error(`[BATCH API] Failed to parse response for ${customId}:`, parseError);
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
      console.error('[BATCH API] Failed to parse result line:', error);
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
  
  console.log(`[BATCH API] Processed ${results.length} results`);
  return results;
}

export async function cancelBatchJob(jobId: string): Promise<BatchJob> {
  console.log(`[BATCH API] Cancelling job: ${jobId}`);
  
  const openaiClient = getOpenAIClient();
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
