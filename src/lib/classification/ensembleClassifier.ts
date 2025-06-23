
import { ClassificationResult } from '../types';
import { advancedClassifyPayee } from './advancedPayeeClassifier';
import { worldClassClassification } from './worldClassRules';
import { classifyWithLocalLLM } from './localLLMClassifier';

interface EnsembleVote {
  classification: 'Business' | 'Individual';
  confidence: number;
  weight: number;
  method: string;
  reasoning: string;
}

/**
 * Ensemble classifier that combines multiple classification methods
 * Uses weighted voting to determine final classification
 */
export async function ensembleClassifyPayee(payeeName: string): Promise<ClassificationResult> {
  console.log(`[ENSEMBLE] Classifying "${payeeName}" with multiple methods`);
  
  const votes: EnsembleVote[] = [];
  
  // Method 1: Advanced Payee Classifier (35% weight)
  try {
    const advancedResult = advancedClassifyPayee(payeeName);
    votes.push({
      classification: advancedResult.classification,
      confidence: advancedResult.confidence / 100,
      weight: 0.35,
      method: 'Advanced Classifier',
      reasoning: advancedResult.reasoning
    });
  } catch (error) {
    console.warn('[ENSEMBLE] Advanced classifier failed:', error);
  }

  // Method 2: Local LLM Classifier (40% weight - highest because it's contextual)
  try {
    const llmResult = await classifyWithLocalLLM(payeeName);
    if (llmResult) {
      votes.push({
        classification: llmResult.classification,
        confidence: llmResult.confidence / 100,
        weight: 0.40,
        method: 'Local LLM',
        reasoning: llmResult.reasoning
      });
    }
  } catch (error) {
    console.warn('[ENSEMBLE] LLM classifier failed:', error);
  }

  // Method 3: World Class Rules (25% weight)
  try {
    const rulesResult = await worldClassClassification(payeeName);
    votes.push({
      classification: rulesResult.classification,
      confidence: rulesResult.confidence / 100,
      weight: 0.25,
      method: 'World Class Rules',
      reasoning: rulesResult.reasoning
    });
  } catch (error) {
    console.warn('[ENSEMBLE] World class rules failed:', error);
  }

  // Calculate weighted votes
  const businessVotes = votes.filter(v => v.classification === 'Business');
  const individualVotes = votes.filter(v => v.classification === 'Individual');

  const businessScore = businessVotes.reduce((sum, vote) => sum + (vote.confidence * vote.weight), 0);
  const individualScore = individualVotes.reduce((sum, vote) => sum + (vote.confidence * vote.weight), 0);

  const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);
  
  // Normalize scores
  const normalizedBusinessScore = businessScore / totalWeight;
  const normalizedIndividualScore = individualScore / totalWeight;

  // Determine final classification
  const finalClassification = normalizedBusinessScore > normalizedIndividualScore ? 'Business' : 'Individual';
  const finalConfidence = Math.max(normalizedBusinessScore, normalizedIndividualScore);

  // Generate reasoning from all votes
  const reasoning = generateEnsembleReasoning(votes, finalClassification);

  console.log(`[ENSEMBLE] Final result: ${finalClassification} (${Math.round(finalConfidence * 100)}%)`);

  return {
    classification: finalClassification,
    confidence: Math.round(finalConfidence * 100),
    reasoning,
    processingTier: 'AI-Powered',
    processingMethod: 'Ensemble Classification'
  };
}

/**
 * Generate reasoning text from ensemble votes
 */
function generateEnsembleReasoning(votes: EnsembleVote[], finalClassification: 'Business' | 'Individual'): string {
  const supportingVotes = votes.filter(v => v.classification === finalClassification);
  const opposingVotes = votes.filter(v => v.classification !== finalClassification);

  let reasoning = `Ensemble classification: ${finalClassification}. `;
  
  if (supportingVotes.length > 0) {
    reasoning += `Supporting evidence: ${supportingVotes.map(v => `${v.method} (${Math.round(v.confidence * 100)}%)`).join(', ')}. `;
  }
  
  if (opposingVotes.length > 0) {
    reasoning += `Dissenting views: ${opposingVotes.map(v => `${v.method} suggested ${v.classification}`).join(', ')}. `;
  }

  // Add the most confident method's reasoning
  const mostConfident = votes.sort((a, b) => b.confidence - a.confidence)[0];
  if (mostConfident && mostConfident.classification === finalClassification) {
    reasoning += `Primary reasoning: ${mostConfident.reasoning}`;
  }

  return reasoning;
}
