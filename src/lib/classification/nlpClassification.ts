import { ClassificationResult } from '../types';
import { BUSINESS_KEYWORDS, LEGAL_SUFFIXES } from './config';
import { probablepeople } from './probablepeople';

/**
 * NLP-based classification using probablepeople for entity recognition
 */
export async function applyNLPClassification(payeeName: string): Promise<ClassificationResult | null> {
  const matchingPatterns: string[] = [];
  
  try {
    // Try to get detailed parsing from probablepeople
    const [parsed, nameType] = await probablepeople.parse(payeeName);
    
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
