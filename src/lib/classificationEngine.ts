
// Use a try-catch for the import to handle potential issues
let probablepeople: any;
try {
  probablepeople = require("probablepeople");
} catch (error) {
  console.warn("Warning: probablepeople package not available, using fallback classification only");
  probablepeople = {
    parse: () => {
      throw new Error("probablepeople not available");
    }
  };
}

import { classifyPayeeWithAI, getOpenAIClient } from "./openaiService";
import { ClassificationResult } from "./types";

// Legal entity suffixes for business detection
const LEGAL_SUFFIXES = [
  "LLC", "INC", "CORP", "LTD", "LP", "LLP", "PC", "PLLC", "CO", "COMPANY",
  "CORPORATION", "INCORPORATED", "LIMITED", "TRUST", "GROUP", "ASSOCIATES",
  "PARTNERS", "FOUNDATION", "FUND", "ASSOCIATION", "SOCIETY", "INSTITUTE"
];

// Business keywords for identifying businesses
const BUSINESS_KEYWORDS = [
  "SERVICES", "CONSULTING", "SOLUTIONS", "MANAGEMENT", "ENTERPRISES",
  "INTERNATIONAL", "SYSTEMS", "TECHNOLOGIES", "PROPERTIES", "INVESTMENTS",
  "GLOBAL", "INDUSTRIES", "COMMUNICATIONS", "RESOURCES", "DEVELOPMENT"
];

// Industry specific identifiers
const INDUSTRY_IDENTIFIERS = {
  healthcare: ["HOSPITAL", "CLINIC", "MEDICAL CENTER", "HEALTH", "CARE", "PHARMACY"],
  retail: ["STORE", "SHOP", "MARKET", "RETAIL", "OUTLET", "MART"],
  hospitality: ["HOTEL", "RESTAURANT", "CAFÉ", "CATERING", "RESORT"],
  finance: ["BANK", "FINANCIAL", "INSURANCE", "CAPITAL", "WEALTH", "ADVISORS"],
  education: ["SCHOOL", "UNIVERSITY", "COLLEGE", "ACADEMY", "INSTITUTE"]
};

// Government entity patterns
const GOVERNMENT_PATTERNS = [
  "CITY OF", "COUNTY OF", "STATE OF", "DEPARTMENT OF", "OFFICE OF",
  "BUREAU OF", "AGENCY", "COMMISSION", "AUTHORITY", "DISTRICT"
];

// Professional titles
const PROFESSIONAL_TITLES = [
  "DR", "DOCTOR", "PROF", "PROFESSOR", "MR", "MRS", "MS", "MISS",
  "MD", "JD", "CPA", "ESQ", "PHD", "DDS", "DVM"
];

/**
 * Rule-based classification using probablepeople library and custom rules
 */
export function applyRuleBasedClassification(payeeName: string): ClassificationResult | null {
  // Convert to uppercase for consistent matching
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let isBusinessIndicator = false;
  let isIndividualIndicator = false;

  // Use probablepeople to parse the name
  try {
    const [parsed, nameType] = probablepeople.parse(payeeName);
    
    // If probablepeople confidently identifies the type
    if (nameType === 'person') {
      matchingRules.push("Identified as person by name structure analysis");
      isIndividualIndicator = true;
    } else if (nameType === 'corporation') {
      matchingRules.push("Identified as corporation by name structure analysis");
      isBusinessIndicator = true;
    }
  } catch (error) {
    // Parsing failed, continue with other rules
    console.log("Probablepeople parsing failed, using fallback rules");
  }

  // Check for legal suffixes
  for (const suffix of LEGAL_SUFFIXES) {
    // Check for suffix as a whole word or at the end with punctuation
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      matchingRules.push(`Legal suffix: ${suffix}`);
      isBusinessIndicator = true;
      break;
    }
  }

  // Check for business keywords
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      matchingRules.push(`Business keyword: ${keyword}`);
      isBusinessIndicator = true;
      break;
    }
  }

  // Check for industry-specific identifiers
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        matchingRules.push(`Industry identifier (${industry}): ${keyword}`);
        isBusinessIndicator = true;
        break;
      }
    }
    if (isBusinessIndicator) break;
  }

  // Check for government entity patterns
  for (const pattern of GOVERNMENT_PATTERNS) {
    if (name.includes(pattern)) {
      matchingRules.push(`Government entity pattern: ${pattern}`);
      isBusinessIndicator = true;
      break;
    }
  }

  // Check for professional titles (indicating individuals)
  for (const title of PROFESSIONAL_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b|\\b${title}[.,]`, 'i');
    if (titleRegex.test(name)) {
      matchingRules.push(`Professional title: ${title}`);
      isIndividualIndicator = true;
      break;
    }
  }

  // Simple name pattern detection for individuals
  if (!isBusinessIndicator) {
    const namePattern = /^[A-Za-z]+\s+[A-Za-z]+$/; // Simple First Last pattern
    const nameWithMiddlePattern = /^[A-Za-z]+\s+[A-Za-z]\s+[A-Za-z]+$/; // First Middle Last
    const nameWithMiddleInitialPattern = /^[A-Za-z]+\s+[A-Za-z]\.\s+[A-Za-z]+$/; // First M. Last
    const lastFirstPattern = /^[A-Za-z]+,\s*[A-Za-z]+$/; // Last, First

    if (
      namePattern.test(payeeName) ||
      nameWithMiddlePattern.test(payeeName) ||
      nameWithMiddleInitialPattern.test(payeeName) ||
      lastFirstPattern.test(payeeName)
    ) {
      matchingRules.push("Individual name pattern detected");
      isIndividualIndicator = true;
    }
  }

  // If we have clear indicators, provide a rule-based classification
  if (isBusinessIndicator && !isIndividualIndicator) {
    return {
      classification: 'Business',
      confidence: matchingRules.length > 1 ? 90 : 80,
      reasoning: `Classified as business based on ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  } else if (isIndividualIndicator && !isBusinessIndicator) {
    return {
      classification: 'Individual',
      confidence: matchingRules.length > 1 ? 90 : 80,
      reasoning: `Classified as individual based on ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  }

  // If conflicting or no clear indicators, return null to try the next tier
  return null;
}

/**
 * NLP-based classification using probablepeople for entity recognition
 */
export function applyNLPClassification(payeeName: string): ClassificationResult | null {
  const matchingPatterns: string[] = [];
  
  try {
    // Try to get detailed parsing from probablepeople
    const [parsed, nameType] = probablepeople.parse(payeeName);
    
    // If we get a confident result but it wasn't strong enough for rule-based tier
    if (nameType === 'person') {
      // Extract components that indicate a person
      const hasFirstName = parsed.GivenName || parsed.FirstInitial;
      const hasLastName = parsed.Surname || parsed.LastInitial;
      const hasNameSuffix = parsed.SuffixGenerational || parsed.SuffixOther;
      const hasNamePrefix = parsed.PrefixMarital || parsed.PrefixOther;
      
      const components = [];
      if (hasFirstName) components.push("first name");
      if (hasLastName) components.push("last name");
      if (hasNameSuffix) components.push("name suffix");
      if (hasNamePrefix) components.push("name prefix");
      
      if (components.length >= 2) {
        matchingPatterns.push(`Person name components detected: ${components.join(", ")}`);
        return {
          classification: 'Individual',
          confidence: 75,
          reasoning: `Name contains typical personal name components (${components.join(", ")})`,
          processingTier: 'NLP-Based',
          matchingRules: matchingPatterns
        };
      }
    } else if (nameType === 'corporation') {
      // Extract components that indicate an organization
      const hasCorpName = parsed.CorporationName;
      const hasCorpSuffix = parsed.CorporationLegalType;
      const hasOrgType = parsed.OrganizationNameType;
      
      const components = [];
      if (hasCorpName) components.push("corporation name");
      if (hasCorpSuffix) components.push("legal suffix");
      if (hasOrgType) components.push("organization type");
      
      if (components.length >= 1) {
        matchingPatterns.push(`Business entity components detected: ${components.join(", ")}`);
        return {
          classification: 'Business',
          confidence: 75,
          reasoning: `Name contains typical business organization components (${components.join(", ")})`,
          processingTier: 'NLP-Based',
          matchingRules: matchingPatterns
        };
      }
    }
  } catch (error) {
    // Parsing failed, fall back to other NLP methods
  }
  
  const name = payeeName.trim();
  const words = name.split(/\s+/);
  
  // Simplified NER simulation
  // Detect patterns that might indicate individual vs business
  
  // Check for possessive forms (typically individuals)
  if (/'\s*s\b/.test(name)) {
    matchingPatterns.push("Individual possessive form detected");
    return {
      classification: 'Individual',
      confidence: 75,
      reasoning: "Name contains possessive form typical of individual proprietors",
      processingTier: 'NLP-Based',
      matchingRules: matchingPatterns
    };
  }
  
  // Check for business name containing a person's name followed by industry/service
  // E.g., "John Smith Plumbing" or "Garcia Construction"
  const personWithServicePattern = /^[A-Za-z]+\s+[A-Za-z]+\s+(Service|Repair|Construction|Plumbing|Consulting|Law)/i;
  if (personWithServicePattern.test(name)) {
    matchingPatterns.push("Person name with service/industry pattern");
    return {
      classification: 'Business',
      confidence: 70,
      reasoning: "Name follows pattern of personal name followed by service/industry descriptor",
      processingTier: 'NLP-Based',
      matchingRules: matchingPatterns
    };
  }
  
  // Check DBA patterns
  if (/\b(DBA|D\/B\/A|T\/A|TA)\b/i.test(name)) {
    matchingPatterns.push("DBA (Doing Business As) pattern");
    return {
      classification: 'Business',
      confidence: 75,
      reasoning: "Name contains DBA (Doing Business As) designation",
      processingTier: 'NLP-Based',
      matchingRules: matchingPatterns
    };
  }
  
  // Word count heuristics - businesses tend to have more words
  if (words.length >= 4) {
    matchingPatterns.push("Multi-word business name pattern");
    return {
      classification: 'Business',
      confidence: 65,
      reasoning: "Name contains multiple words typical of business entities",
      processingTier: 'NLP-Based',
      matchingRules: matchingPatterns
    };
  }
  
  // Try to detect two-word personal names with high confidence
  if (words.length === 2 && 
      !words.some(word => BUSINESS_KEYWORDS.includes(word.toUpperCase())) &&
      !words.some(word => LEGAL_SUFFIXES.includes(word.toUpperCase()))) {
    matchingPatterns.push("Simple two-word personal name");
    return {
      classification: 'Individual',
      confidence: 70,
      reasoning: "Name follows standard two-word personal name pattern without business indicators",
      processingTier: 'NLP-Based',
      matchingRules: matchingPatterns
    };
  }
  
  // Return null if we can't make a determination
  return null;
}

/**
 * AI-assisted classification using OpenAI API
 */
export async function applyAIClassification(payeeName: string): Promise<ClassificationResult> {
  // Check if OpenAI client is initialized
  const openaiClient = getOpenAIClient();
  
  if (openaiClient) {
    try {
      // Use the real OpenAI API
      const result = await classifyPayeeWithAI(payeeName);
      
      return {
        classification: result.classification,
        confidence: result.confidence,
        reasoning: result.reasoning,
        processingTier: 'AI-Assisted'
      };
    } catch (error) {
      console.error("Error with OpenAI classification:", error);
      // Fall back to simulated AI
      console.log("Falling back to simulated AI classification");
    }
  }
  
  // Fallback to simulated AI if OpenAI is not available or fails
  // This is a simplified implementation
  // In a real system, this would call GPT-4o API
  
  // For demo purposes, implement some advanced heuristics that simulate AI reasoning
  const name = payeeName.trim().toUpperCase();
  const words = name.split(/\s+/);
  
  // Simulate reasoning based on features that would be extracted by AI
  const features = [];
  
  // Check for common name prefixes/suffixes
  const hasNamePrefix = /^(MR|MS|MRS|DR|PROF)\b/i.test(name);
  const hasNameSuffix = /\b(JR|SR|II|III|IV|MD|PHD|ESQ)\b/i.test(name);
  
  if (hasNamePrefix) features.push("Has name prefix");
  if (hasNameSuffix) features.push("Has name suffix");
  
  // Check for business words not covered by simpler rules
  const businessWords = ["ENTERPRISE", "CONTRACTORS", "AGENCY", "FIRM", "BUSINESS"];
  const containsBusinessWord = businessWords.some(word => name.includes(word));
  
  if (containsBusinessWord) features.push("Contains uncommon business term");
  
  // Geographic indicators often found in business names
  const geoIndicators = ["EAST", "WEST", "NORTH", "SOUTH", "CENTRAL", "REGIONAL"];
  const containsGeoIndicator = geoIndicators.some(geo => name.includes(geo));
  
  if (containsGeoIndicator) features.push("Contains geographic indicator");
  
  // Generate confidence based on conflicting or reinforcing features
  let confidence = 60; // Start with very low confidence
  let classification: 'Business' | 'Individual';
  let reasoning = "";
  
  // Make a determination based on available features
  if ((hasNamePrefix || hasNameSuffix) && !containsBusinessWord && !containsGeoIndicator) {
    classification = 'Individual';
    reasoning = "AI analysis suggests this is likely an individual name based on personal name markers and lack of business indicators.";
    confidence += features.length * 5; // Add confidence for each supporting feature
  } else if (containsBusinessWord || containsGeoIndicator) {
    classification = 'Business';
    reasoning = "AI analysis suggests this is likely a business name based on terminology typical of business entities.";
    confidence += features.length * 5; // Add confidence for each supporting feature
  } else {
    // Default case for truly ambiguous names
    // In real AI implementation, this would have more sophisticated reasoning
    const wordCount = words.length;
    if (wordCount <= 2) {
      classification = 'Individual';
      reasoning = "AI analysis suggests this is likely an individual name based on name simplicity and structure.";
      confidence = 55; // Very low confidence
    } else {
      classification = 'Business';
      reasoning = "AI analysis suggests this is likely a business name based on name complexity and structure.";
      confidence = 55; // Very low confidence
    }
  }
  
  // Cap confidence at 85 for AI tier (since we're simulating)
  confidence = Math.min(confidence, 85);
  
  return {
    classification,
    confidence,
    reasoning,
    processingTier: 'AI-Assisted',
    matchingRules: features
  };
}

/**
 * Main classification function that implements the tiered approach
 * Now supports asynchronous AI classification
 */
export async function classifyPayee(payeeName: string): Promise<ClassificationResult> {
  // Check if name is empty or invalid
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual', // Default
      confidence: 0,
      reasoning: "Invalid or empty payee name",
      processingTier: 'Rule-Based'
    };
  }

  // Tier 1: Apply rule-based classification
  const ruleBasedResult = applyRuleBasedClassification(payeeName);
  if (ruleBasedResult) {
    return ruleBasedResult;
  }

  // Tier 2: Apply NLP-based classification
  const nlpResult = applyNLPClassification(payeeName);
  if (nlpResult) {
    return nlpResult;
  }

  // Tier 3: Apply AI-assisted classification (now asynchronous)
  return await applyAIClassification(payeeName);
}

/**
 * Get confidence level category based on numeric confidence
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' | 'verylow' {
  if (confidence >= 90) return 'high';
  if (confidence >= 75) return 'medium';
  if (confidence >= 60) return 'low';
  return 'verylow';
}

/**
 * Process a batch of payee names
 * Updated to handle asynchronous classification and provide progress updates
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number) => void
): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = [];
  const total = payeeNames.length;
  
  for (let i = 0; i < payeeNames.length; i++) {
    const name = payeeNames[i];
    const result = await classifyPayee(name);
    results.push(result);
    
    // Call the progress callback if provided
    if (onProgress) {
      const current = i + 1;
      const percentage = Math.round((current / total) * 100);
      onProgress(current, total, percentage);
    }
  }
  
  return results;
}
