
// Simplified probablepeople-like functionality without external dependencies
export interface NameParsing {
  type: 'Person' | 'Corporation';
  confidence: number;
}

export function parsePersonName(name: string): NameParsing {
  const cleanName = name.trim().toLowerCase();
  
  // Business indicators
  const businessKeywords = [
    'llc', 'inc', 'corp', 'ltd', 'company', 'co', 'corporation',
    'enterprises', 'group', 'associates', 'partners', 'holdings',
    'solutions', 'services', 'systems', 'technologies', 'consulting'
  ];
  
  // Check for business indicators
  const hasBusinessKeyword = businessKeywords.some(keyword => 
    cleanName.includes(keyword)
  );
  
  if (hasBusinessKeyword) {
    return {
      type: 'Corporation',
      confidence: 0.85
    };
  }
  
  // Simple person name pattern check
  const words = cleanName.split(/\s+/);
  const hasPersonPattern = words.length >= 2 && words.length <= 4;
  
  return {
    type: 'Person',
    confidence: hasPersonPattern ? 0.7 : 0.5
  };
}
