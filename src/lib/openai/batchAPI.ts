
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
 * Process batch classification using a simplified approach
 * Note: This implementation uses sequential processing as a fallback
 * since the OpenAI Batch API requires enterprise access
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
    const client = getOpenAIClient();
    const results: BatchClassificationResult[] = [];
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 10;
    const totalBatches = Math.ceil(payeeNames.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, payeeNames.length);
      const batchNames = payeeNames.slice(startIndex, endIndex);
      
      onProgress?.(`Processing batch ${batchIndex + 1}/${totalBatches}...`, 
                  Math.round((batchIndex / totalBatches) * 100));
      
      // Process batch concurrently
      const batchPromises = batchNames.map(async (name, index) => {
        try {
          const response = await client.chat.completions.create({
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
          });
          
          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error('No response content');
          }
          
          const parsed = JSON.parse(content);
          
          return {
            payeeName: name,
            classification: parsed.classification || 'Individual',
            confidence: parsed.confidence || 50,
            reasoning: parsed.reasoning || 'Processed via OpenAI API',
            status: 'success' as const
          };
          
        } catch (error) {
          console.error(`[BATCH API] Failed to process ${name}:`, error);
          return {
            payeeName: name,
            classification: 'Individual' as const,
            confidence: 0,
            reasoning: 'Failed to process with AI',
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
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
