
import { OpenAIClient } from './client';
import { getOpenAIClient } from './utils';
import { ClassificationResult } from '../types';

interface AIClassificationResponse {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  matchingRules?: string[];
}

/**
 * Enhanced AI classification using chain-of-thought reasoning and specific payee classification rules
 * @param payeeName Name to classify
 * @returns Classification result with confidence and reasoning
 */
export async function enhancedClassifyPayeeWithAI(payeeName: string): Promise<AIClassificationResponse> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    throw new Error("OpenAI client is not initialized");
  }
  
  try {
    const prompt = `
You are a payee name classifier that determines if a name belongs to a business (organization) or an individual (person).

ANALYZE THE FOLLOWING NAME: "${payeeName}"

First, consider these classification rules:
1. Legal entity suffixes like LLC, Inc, Ltd, GmbH, S.A., etc. indicate businesses
2. Words like Company, Corporation, Group, Partners, etc. indicate businesses
3. Government entities (City of, Department of, etc.) are businesses
4. First name + last name patterns typically indicate individuals
5. Professional titles (Dr, Mr, Mrs, etc.) indicate individuals
6. Name suffixes (Jr, Sr, III, etc.) indicate individuals
7. Consider cultural patterns for names across different languages/regions

Step-by-step analysis:
`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system", 
          content: "You are an expert in payee name classification that determines if a name belongs to a business entity or an individual person. You must analyze names carefully using linguistic markers, legal entity identifiers, and cross-cultural name patterns."
        },
        { role: "user", content: prompt }
      ],
      functions: [
        {
          name: "classifyPayeeName",
          description: "Classify a payee name as either a business or individual",
          parameters: {
            type: "object",
            properties: {
              classification: {
                type: "string",
                description: "The classification result",
                enum: ["Business", "Individual"]
              },
              confidence: {
                type: "number",
                description: "Confidence score (0-100) for the classification"
              },
              reasoning: {
                type: "string",
                description: "Brief reasoning for the classification decision, 25 words or less"
              },
              matchingRules: {
                type: "array",
                description: "List of rules that matched during classification",
                items: { type: "string" }
              }
            },
            required: ["classification", "confidence", "reasoning"]
          }
        }
      ],
      function_call: { name: "classifyPayeeName" }
    });
    
    const result = response.choices[0]?.message?.function_call?.arguments;
    
    if (!result) {
      throw new Error("Invalid response from OpenAI API");
    }
    
    try {
      const parsedResult = JSON.parse(result) as AIClassificationResponse;
      return {
        classification: parsedResult.classification,
        confidence: parsedResult.confidence,
        reasoning: parsedResult.reasoning,
        matchingRules: parsedResult.matchingRules || []
      };
    } catch (error) {
      throw new Error("Failed to parse OpenAI API response");
    }
  } catch (error) {
    console.error("Error in AI classification:", error);
    throw error;
  }
}

/**
 * Consensus classification that runs multiple AI classifications and combines results
 * Inspired by Self-Consistency method used in advanced NLP ensembles
 * 
 * @param payeeName The payee name to classify
 * @param runs Number of classification runs to perform (default 3)
 * @returns Combined classification result with consensus confidence
 */
export async function consensusClassification(
  payeeName: string,
  runs: number = 3
): Promise<AIClassificationResponse> {
  const classifications: AIClassificationResponse[] = [];
  
  // Run multiple classifications
  for (let i = 0; i < runs; i++) {
    try {
      const result = await enhancedClassifyPayeeWithAI(payeeName);
      classifications.push(result);
    } catch (error) {
      console.error(`Error in classification run ${i+1}:`, error);
      // Continue with other runs
    }
    
    // Small delay between runs to avoid rate limiting
    if (i < runs - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // If we couldn't get any successful classifications, throw an error
  if (classifications.length === 0) {
    throw new Error("All classification attempts failed");
  }
  
  // Count classifications for each category
  const businessCount = classifications.filter(c => c.classification === 'Business').length;
  const individualCount = classifications.filter(c => c.classification === 'Individual').length;
  
  // Calculate entropy to measure disagreement
  const totalRuns = businessCount + individualCount;
  const businessProb = businessCount / totalRuns;
  const individualProb = individualCount / totalRuns;
  const entropy = calculateEntropy(businessProb, individualProb);
  
  // Get the majority classification
  const majorityClassification = businessCount > individualCount ? 'Business' : 'Individual';
  
  // Get median confidence for the majority classification
  const confidences = classifications
    .filter(c => c.classification === majorityClassification)
    .map(c => c.confidence)
    .sort((a, b) => a - b);
  
  const medianConfidence = confidences.length > 0 
    ? confidences[Math.floor(confidences.length / 2)]
    : 50;
  
  // Adjust confidence based on consensus level
  const consensusRatio = Math.max(businessCount, individualCount) / totalRuns;
  const adjustedConfidence = Math.round(medianConfidence * consensusRatio);
  
  // Get the most detailed reasoning or combine them
  const majorityReasoning = classifications.find(c => c.classification === majorityClassification)?.reasoning || "";
  
  // Collect all matching rules
  const allMatchingRules = new Set<string>();
  classifications.forEach(c => {
    c.matchingRules?.forEach(rule => allMatchingRules.add(rule));
  });
  
  return {
    classification: majorityClassification,
    confidence: adjustedConfidence,
    reasoning: `Consensus classification (${Math.round(consensusRatio * 100)}% agreement): ${majorityReasoning}`,
    matchingRules: Array.from(allMatchingRules)
  };
}

/**
 * Calculate Shannon entropy to measure classification disagreement
 */
function calculateEntropy(businessProb: number, individualProb: number): number {
  const calculateComponent = (p: number) => (p === 0) ? 0 : -p * Math.log2(p);
  return calculateComponent(businessProb) + calculateComponent(individualProb);
}
