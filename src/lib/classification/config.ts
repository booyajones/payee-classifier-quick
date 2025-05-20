import { ClassificationConfig } from '../types';

// Default classification configuration
export const DEFAULT_CLASSIFICATION_CONFIG: ClassificationConfig = {
  aiThreshold: 75, // Default threshold - use AI when confidence is below 75%
  bypassRuleNLP: false // By default, don't bypass rule-based and NLP classification
};

// Increased concurrency limits for better parallel processing
export const MAX_CONCURRENCY = 20; // Doubled from 10

// Maximum batch size for AI classification
export const MAX_BATCH_SIZE = 5;

// Legal entity suffixes for business detection
export const LEGAL_SUFFIXES = [
  "LLC", "INC", "CORP", "LTD", "LP", "LLP", "PC", "PLLC", "CO", "COMPANY",
  "CORPORATION", "INCORPORATED", "LIMITED", "TRUST", "GROUP", "ASSOCIATES",
  "PARTNERS", "FOUNDATION", "FUND", "ASSOCIATION", "SOCIETY", "INSTITUTE"
];

// Business keywords for identifying businesses
export const BUSINESS_KEYWORDS = [
  "SERVICES", "CONSULTING", "SOLUTIONS", "MANAGEMENT", "ENTERPRISES",
  "INTERNATIONAL", "SYSTEMS", "TECHNOLOGIES", "PROPERTIES", "INVESTMENTS",
  "GLOBAL", "INDUSTRIES", "COMMUNICATIONS", "RESOURCES", "DEVELOPMENT"
];

// Industry specific identifiers
export const INDUSTRY_IDENTIFIERS = {
  healthcare: ["HOSPITAL", "CLINIC", "MEDICAL CENTER", "HEALTH", "CARE", "PHARMACY"],
  retail: ["STORE", "SHOP", "MARKET", "RETAIL", "OUTLET", "MART"],
  hospitality: ["HOTEL", "RESTAURANT", "CAFÉ", "CATERING", "RESORT"],
  finance: ["BANK", "FINANCIAL", "INSURANCE", "CAPITAL", "WEALTH", "ADVISORS"],
  education: ["SCHOOL", "UNIVERSITY", "COLLEGE", "ACADEMY", "INSTITUTE"]
};

// Government entity patterns
export const GOVERNMENT_PATTERNS = [
  "CITY OF", "COUNTY OF", "STATE OF", "DEPARTMENT OF", "OFFICE OF",
  "BUREAU OF", "AGENCY", "COMMISSION", "AUTHORITY", "DISTRICT"
];

// Professional titles
export const PROFESSIONAL_TITLES = [
  "DR", "DOCTOR", "PROF", "PROFESSOR", "MR", "MRS", "MS", "MISS",
  "MD", "JD", "CPA", "ESQ", "PHD", "DDS", "DVM"
];
