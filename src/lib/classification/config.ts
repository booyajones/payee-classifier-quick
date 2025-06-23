import { ClassificationConfig } from '../types';

// Helper function to safely get environment variables
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

// Default classification configuration - updated with LLM options
export const DEFAULT_CLASSIFICATION_CONFIG: ClassificationConfig = {
  aiThreshold: 75, // Use AI only when confidence is below 75%
  bypassRuleNLP: false, // Run rule and NLP tiers before any AI heuristics
  offlineMode: false, // Enable LLM by default for better accuracy
  useFuzzyMatching: true, // Use fuzzy matching for better results
  useCacheForDuplicates: true, // Deduplicate similar names
  useLLMClassification: true, // NEW: Enable local LLM classification
  llmConfidenceThreshold: 70 // NEW: Minimum confidence for LLM results
};

// Increased concurrency limits for better parallel processing
const envConcurrency = parseInt(getEnvVar('CLASSIFIER_MAX_CONCURRENCY', '20'), 10);
export const MAX_CONCURRENCY =
  Number.isFinite(envConcurrency) && envConcurrency > 0 ? envConcurrency : 20; // Doubled from 10

// Maximum batch size for AI classification
const envBatchSize = parseInt(getEnvVar('CLASSIFIER_MAX_BATCH_SIZE', '15'), 10);
export const MAX_BATCH_SIZE =
  Number.isFinite(envBatchSize) && envBatchSize > 0 ? envBatchSize : 15; // Increased from 5

// Extended name similarity threshold (Levenshtein distance %)
export const NAME_SIMILARITY_THRESHOLD = 85; // 85% similar names treated as same

// Legal entity suffixes for business detection
export const LEGAL_SUFFIXES = [
  "LLC", "INC", "CORP", "LTD", "LP", "LLP", "PC", "PLLC", "CO", "COMPANY",
  "CORPORATION", "INCORPORATED", "LIMITED", "TRUST", "GROUP", "ASSOCIATES",
  "PARTNERS", "FOUNDATION", "FUND", "ASSOCIATION", "SOCIETY", "INSTITUTE",
  // Common international legal suffixes
  "GMBH", "AG", "KG", "S.A.", "SA", "SAS", "S.A.S.", "SARL", "S.A.R.L.",
  "S.L.", "SL", "SRL", "S.R.L.", "S.P.A.", "SPA", "LTDA", "EURL", "BV",
  "N.V.", "NV", "B.V.", "OY", "AB", "PT", "OOO"
];

// SIGNIFICANTLY EXPANDED business keywords with service industry focus
export const BUSINESS_KEYWORDS = [
  // SERVICE INDUSTRY (CRITICAL - these were missing!)
  "LOCKSMITH", "EXPRESS", "AUTO", "AUTOMOTIVE", "REPAIR", "MAINTENANCE", "INSTALLATION",
  "PLUMBING", "ELECTRICAL", "ROOFING", "FLOORING", "PAINTING", "CLEANING", "LANDSCAPING",
  "PEST", "CONTROL", "SECURITY", "ALARM", "FIRE", "PROTECTION", "EMERGENCY", "HVAC",
  
  // Core business terms
  "SERVICES", "CONSULTING", "SOLUTIONS", "MANAGEMENT", "ENTERPRISES",
  "INTERNATIONAL", "SYSTEMS", "TECHNOLOGIES", "PROPERTIES", "INVESTMENTS",
  "GLOBAL", "INDUSTRIES", "COMMUNICATIONS", "RESOURCES", "DEVELOPMENT",
  
  // Professional services
  "ACCOUNTING", "LEGAL", "LAW", "ATTORNEY", "CPA", "TAX", "INSURANCE",
  "REAL", "ESTATE", "REALTY", "MORTGAGE", "LOAN", "FINANCE", "FINANCIAL",
  
  // Trade and manufacturing
  "CONSTRUCTION", "CONTRACTING", "BUILDING", "MANUFACTURING", "SUPPLY",
  "EQUIPMENT", "TOOLS", "HARDWARE", "MATERIALS", "WHOLESALE", "RETAIL",
  
  // Food and hospitality
  "RESTAURANT", "CAFE", "CATERING", "FOOD", "BAKERY", "DELI", "BAR",
  "GRILL", "PIZZA", "BURGER", "COFFEE", "HOTEL", "MOTEL", "INN",
  
  // Healthcare and wellness
  "MEDICAL", "DENTAL", "HEALTH", "CLINIC", "PHARMACY", "THERAPY",
  "WELLNESS", "FITNESS", "GYM", "SPA", "MASSAGE",
  
  // Technology and communications
  "TECH", "SOFTWARE", "COMPUTER", "IT", "INTERNET", "WEB", "DIGITAL",
  "PHONE", "MOBILE", "WIRELESS", "CABLE", "SATELLITE",
  
  // Transportation and logistics
  "TRANSPORT", "SHIPPING", "DELIVERY", "MOVING", "STORAGE", "WAREHOUSE",
  "TRUCK", "TAXI", "CAB", "UBER", "LYFT", "RENTAL", "LEASE",
  
  // Business qualifiers
  "PROFESSIONAL", "QUALITY", "PREMIUM", "ELITE", "EXPERT", "MASTER",
  "ADVANCED", "SUPERIOR", "BEST", "TOP", "FIRST", "PRIME", "CHOICE",
  "QUICK", "FAST", "RAPID", "INSTANT", "SAME", "DAY"
];

// ENHANCED industry identifiers with service focus
export const INDUSTRY_IDENTIFIERS = {
  services: [
    // SERVICE INDUSTRY EXPANSION
    "LOCKSMITH", "EXPRESS", "AUTO", "REPAIR", "MAINTENANCE", "INSTALLATION", "PLUMBING", 
    "ELECTRICAL", "ROOFING", "FLOORING", "PAINTING", "CLEANING", "LANDSCAPING", "GARDENING",
    "PEST", "CONTROL", "SECURITY", "ALARM", "FIRE", "PROTECTION", "EMERGENCY", "HVAC",
    "AIR", "CONDITIONING", "HEATING", "POOLS", "MECHANICAL", "EVENTS", "PLANNERS",
    
    // Professional services
    "CONSULTING", "ADVISORY", "PROFESSIONAL", "LEGAL", "ACCOUNTING", "MARKETING", 
    "ADVERTISING", "DESIGN", "CREATIVE", "ARCHITECTURE", "ENGINEERING", "CONSTRUCTION",
    "REMODELING", "RENOVATION", "SURFACE", "CLEAN", "DESIGNS"
  ],
  healthcare: [
    "HOSPITAL", "CLINIC", "MEDICAL CENTER", "HEALTH", "CARE", "PHARMACY",
    "MEDICAL", "HEALTHCARE", "DENTAL", "PHYSICIANS", "LABORATORIES", "DIAGNOSTIC",
    "WELLNESS", "THERAPY", "REHABILITATION", "NURSING", "HOSPICE", "URGENT", "EMERGENCY"
  ],
  retail: [
    "STORE", "SHOP", "MARKET", "RETAIL", "OUTLET", "MART", "BOUTIQUE",
    "EMPORIUM", "SUPERMARKET", "HYPERMARKET", "MALL", "PLAZA", "GALLERY",
    "WHOLESALE", "DISCOUNT", "WAREHOUSE", "BAZAAR", "SHOPPES", "OUTLET"
  ],
  hospitality: [
    "HOTEL", "RESTAURANT", "CAFÉ", "CATERING", "RESORT", "DINER", 
    "BAKERY", "BISTRO", "PIZZERIA", "GRILL", "TAVERN", "PUB", "BAR",
    "LODGE", "INN", "MOTEL", "SUITES", "SPA", "HOSTEL", "ACCOMMODATION",
    "VACATION", "LOUNGE", "BRASSERIE", "EATERY", "MARRIOTT"
  ],
  finance: [
    "BANK", "FINANCIAL", "INSURANCE", "CAPITAL", "WEALTH", "ADVISORS",
    "INVESTMENT", "FINANCE", "MORTGAGE", "ASSET", "CREDIT", "TRUST",
    "SAVINGS", "LOAN", "SECURITIES", "BROKERAGE", "FUND", "ADVISORY",
    "EXCHANGE", "RETIREMENT", "BANKING", "ACCOUNTING", "TAX", "AUDIT",
    "FISCAL", "HOLDINGS", "EQUITY", "VENTURE", "MUTUAL", "PINNACLE", "GAS"
  ],
  education: [
    "SCHOOL", "UNIVERSITY", "COLLEGE", "ACADEMY", "INSTITUTE", "EDUCATION",
    "CAMPUS", "ELEMENTARY", "MIDDLE", "HIGH SCHOOL", "KINDERGARTEN",
    "PRESCHOOL", "NURSERY", "SEMINARY", "TUTORING", "LEARNING CENTER", 
    "TRAINING", "POLYTECHNIC", "MONTESSORI", "EDUCATIONAL"
  ],
  technology: [
    "TECH", "SOFTWARE", "HARDWARE", "COMPUTING", "DATA", "DIGITAL",
    "IT", "INFORMATION TECHNOLOGY", "WEB", "MOBILE", "CYBER", "NETWORK",
    "ELECTRONICS", "TELECOM", "SEMICONDUCTOR", "CLOUD", "AI", "ROBOTICS",
    "INNOVATIONS", "TECHNOLOGIES", "SYSTEMS", "GRAPHICS", "ADVANCED", "RESOURCING"
  ]
};

// Government entity patterns
export const GOVERNMENT_PATTERNS = [
  "CITY OF", "COUNTY OF", "STATE OF", "UNITED STATES", "U.S.", "US", "FEDERAL", 
  "DEPARTMENT OF", "OFFICE OF", "BUREAU OF", "AGENCY", "COMMISSION", "AUTHORITY", 
  "DISTRICT", "BOARD OF", "ADMINISTRATION", "DIVISION OF", "COMMITTEE", "COUNCIL OF",
  "MINISTRY OF", "NATIONAL", "ROYAL", "COMMONWEALTH", "REPUBLIC OF", "GOVERNMENT OF",
  "PROVINCIAL", "MUNICIPAL", "PARLIAMENT", "ASSEMBLY", "SENATE", "EMBASSY OF",
  "CONSULATE", "PUBLIC WORKS", "COURT OF", "JUDICIARY", "REVENUE", "POLICE"
];

// Professional titles
export const PROFESSIONAL_TITLES = [
  "DR", "DOCTOR", "PROF", "PROFESSOR", "MR", "MRS", "MS", "MISS",
  "MD", "JD", "CPA", "ESQ", "PHD", "DDS", "DVM", "RN", "DO", "DC",
  "LPN", "PA", "NP", "LCSW", "CRNA", "PTA", "OT", "PT",
  "CAPT", "CPT", "COL", "GEN", "MAJ", "LT", "SGT", "ADM", "CMDR",
  "REV", "FR", "PASTOR", "RABBI", "IMAM", "BISHOP", "ELDER", "DEACON",
  "HON", "SIR", "DAME", "LORD", "LADY", "HRH", "SHEIKH", "EMINENCE"
];
