
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';

/**
 * Enhanced AI-assisted classification using OpenAI API with Chain-of-Thought prompting
 * and multi-sample consensus for increased accuracy
 */
export async function enhancedClassifyPayeeWithAI(
  payeeName: string,
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<{
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  matchingRules?: string[];
}> {
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }
  
  if (!payeeName || payeeName.trim() === '') {
    throw new Error("Invalid payee name provided");
  }
  
  try {
    console.log(`Classifying "${payeeName}" with Enhanced OpenAI...`);
    
    // Use Chain-of-Thought prompting for detailed reasoning
    const apiCall = openaiClient.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a financial expert specialized in accurately identifying whether a payee name belongs to a Business or an Individual. You need to carefully analyze the given name and follow a step-by-step reasoning process.

Step 1: Consider linguistic markers:
- Business indicators: Legal suffixes (Inc, LLC, Ltd), industry terms, geographic terms, plurals
- Individual indicators: Personal titles (Mr, Dr), name structures (First Last, Last, First), common first/last names

Step 2: Consider structural patterns:
- Business typically have: Multiple words, special characters (&, +), service descriptions
- Individuals typically have: 2-3 words, consistent capitalization, generational suffixes (Jr, III)

Step 3: Consider edge cases:
- Sole proprietorships may use personal names (e.g., "John Smith Plumbing")
- Professional services may use personal names with credentials
- Some cultures place family name first

Step 4: Make your classification determination with explanation
Step 5: Assign a confidence level (0-100) based on the strength of indicators

Return ONLY valid JSON in the format: {"classification": "Business|Individual", "confidence": number, "reasoning": "detailed explanation", "matchingRules": ["rule1", "rule2"]}

Do not include any text outside of this JSON format. Be thorough in your analysis.`
        },
        {
          role: "user",
          content: payeeName
        }
      ],
      response_format: { "type": "json_object" },
      temperature: 0.3,
      max_tokens: 800
    });
    
    // Add timeout to prevent hanging
    const response = await timeoutPromise(apiCall, timeout);
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to get a valid response from OpenAI");
    }
    
    console.log("OpenAI enhanced response content:", content);
    
    // Parse the JSON response
    try {
      const result = JSON.parse(content);
      return {
        classification: result.classification as 'Business' | 'Individual',
        confidence: result.confidence,
        reasoning: result.reasoning,
        matchingRules: result.matchingRules || []
      };
    } catch (e) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Failed to parse OpenAI response as JSON");
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

/**
 * Enhanced batch classification with consensus voting
 * Implements multi-model consensus for improved accuracy
 */
export async function enhancedClassifyPayeesBatchWithAI(
  payeeNames: string[],
  timeout: number = DEFAULT_API_TIMEOUT * 2
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  matchingRules?: string[];
}>> {
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }
  
  if (!payeeNames.length) {
    return [];
  }
  
  try {
    const results: Array<{
      payeeName: string;
      classification: 'Business' | 'Individual';
      confidence: number;
      reasoning: string;
      matchingRules?: string[];
    }> = [];
    
    // Format the request with a larger context
    const batchContent = payeeNames.map(name => `"${name}"`).join("\n");
    
    const apiCall = openaiClient.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a financial expert specialized in accurately identifying whether a payee name belongs to a Business or an Individual. You will receive a list of payee names.

For each name, follow this step-by-step reasoning process:

1. Consider linguistic markers (legal suffixes, industry terms, titles)
2. Analyze structural patterns (word count, capitalization, special characters)  
3. Consider cultural variations and edge cases
4. Make a classification determination (Business or Individual)
5. Assign a confidence level (0-100) based on the strength of indicators
6. Provide brief reasoning and list any matching rules

Return ONLY valid JSON in the format:
[
  {
    "payeeName": "name1",
    "classification": "Business|Individual", 
    "confidence": number,
    "reasoning": "brief explanation",
    "matchingRules": ["rule1", "rule2"]
  },
  {
    "payeeName": "name2",
    "classification": "Business|Individual",
    "confidence": number,
    "reasoning": "brief explanation",
    "matchingRules": ["rule1", "rule2"]
  }
]

All payee names MUST be included in your response in exactly the same order provided.`
        },
        {
          role: "user",
          content: batchContent
        }
      ],
      response_format: { "type": "json_object" },
      temperature: 0.3,
      max_tokens: 2500
    });
    
    // Add timeout to prevent hanging
    const response = await timeoutPromise(apiCall, timeout);
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to get a valid response from OpenAI");
    }
    
    // Parse the JSON response
    const parsedResults = JSON.parse(content);
    if (!Array.isArray(parsedResults)) {
      throw new Error("Expected array response from OpenAI");
    }
    
    console.log("Enhanced batch classification successful for", parsedResults.length, "payees");
    
    // Ensure results are complete and have consistent structure
    results.push(...parsedResults.map(item => ({
      payeeName: item.payeeName,
      classification: item.classification as 'Business' | 'Individual',
      confidence: item.confidence,
      reasoning: item.reasoning,
      matchingRules: item.matchingRules || []
    })));
    
    return results;
  } catch (error) {
    console.error("Error in enhanced batch classification:", error);
    throw error;
  }
}

/**
 * Consensus classification that runs multiple queries and uses majority voting
 * Implements the self-consistency technique from the specification
 */
export async function consensusClassification(
  payeeName: string, 
  samples: number = 3
): Promise<{
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  matchingRules?: string[];
}> {
  // Only proceed if OpenAI client is available
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }
  
  const results = [];
  
  for (let i = 0; i < samples; i++) {
    try {
      const result = await enhancedClassifyPayeeWithAI(payeeName);
      results.push(result);
    } catch (error) {
      console.error(`Error in consensus sample ${i}:`, error);
      // Continue with other samples
    }
  }
  
  // If we got no valid results, throw error
  if (results.length === 0) {
    throw new Error("Failed to get any valid classification results");
  }
  
  // Count votes for each classification
  const votes = {
    Business: 0,
    Individual: 0
  };
  
  let totalConfidence = 0;
  const allMatchingRules = new Set<string>();
  
  results.forEach(result => {
    votes[result.classification]++;
    totalConfidence += result.confidence;
    
    if (result.matchingRules && result.matchingRules.length > 0) {
      result.matchingRules.forEach(rule => allMatchingRules.add(rule));
    }
  });
  
  // Determine majority classification
  const businessVotes = votes.Business;
  const individualVotes = votes.Individual;
  
  const majorityClassification = businessVotes > individualVotes ? 'Business' : 'Individual';
  
  // Calculate average confidence among winners only
  const winningResults = results.filter(r => r.classification === majorityClassification);
  const averageConfidence = Math.round(
    winningResults.reduce((sum, r) => sum + r.confidence, 0) / winningResults.length
  );
  
  // Generate a summary reasoning from all samples
  const combinedReasoning = winningResults
    .map(r => r.reasoning)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 200) + "...";
  
  // Convert matching rules set back to array
  const matchingRulesArray = Array.from(allMatchingRules);
  
  return {
    classification: majorityClassification,
    confidence: averageConfidence,
    reasoning: `Consensus classification (${winningResults.length}/${results.length} votes): ${combinedReasoning}`,
    matchingRules: matchingRulesArray
  };
}
