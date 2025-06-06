
import { ValidationResult } from './types';

export const validateFileContents = (data: any[]): ValidationResult => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('File appears to be empty or invalid');
  }

  // Remove header row if it exists (detect by checking if first row has likely header values)
  const hasHeader = data.length > 1 && 
    Object.values(data[0]).some(value => 
      typeof value === 'string' && 
      /^(name|payee|vendor|company|client|customer)/i.test(value as string)
    );
  
  const dataRows = hasHeader ? data.slice(1) : data;
  const originalData = [...dataRows]; // Preserve complete original data
  
  if (dataRows.length === 0) {
    throw new Error('No data rows found in the file');
  }

  // Extract payee names from the first column or find a column with names
  const payeeNames: string[] = [];
  
  for (const row of dataRows) {
    if (!row || typeof row !== 'object') continue;
    
    // Get the first non-empty value from the row, or look for common payee name columns
    const keys = Object.keys(row);
    let payeeName = '';
    
    // Look for common payee name column names first
    const nameKeys = keys.filter(key => 
      /^(name|payee|vendor|company|client|customer|recipient)/i.test(key)
    );
    
    if (nameKeys.length > 0) {
      payeeName = String(row[nameKeys[0]] || '').trim();
    } else {
      // Fallback to first non-empty column
      for (const key of keys) {
        const value = String(row[key] || '').trim();
        if (value && value.length > 0) {
          payeeName = value;
          break;
        }
      }
    }
    
    if (payeeName && payeeName.length > 0) {
      payeeNames.push(payeeName);
    }
  }

  if (payeeNames.length === 0) {
    throw new Error('No valid payee names found in the file. Please ensure the first column contains payee names.');
  }

  console.log(`[FILE VALIDATION] Extracted ${payeeNames.length} payee names and preserved ${originalData.length} original data rows`);
  
  return {
    payeeNames,
    originalData // Return complete original data
  };
};

export const cleanPayeeNames = (payeeNames: string[]): string[] => {
  return [...new Set(
    payeeNames
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .filter(name => name.length <= 200) // Reasonable max length
  )];
};
