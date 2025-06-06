import { FileValidationError, ERROR_CODES } from './errorHandler';
import * as XLSX from 'xlsx';

export interface FileValidationResult {
  isValid: boolean;
  error?: FileValidationError;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    rowCount?: number;
    columnCount?: number;
  };
}

export interface ValidationResult {
  payeeNames: string[];
  originalData: any[]; // Add original data to validation result
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_ROWS = 50000; // Maximum payee names to process
export const SUPPORTED_EXTENSIONS = ['xlsx', 'xls', 'csv'];

export const validateFile = (file: File): FileValidationResult => {
  console.log(`[FILE VALIDATION] Validating file: ${file.name}, size: ${file.size} bytes`);

  // Check file size
  if (file.size === 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.EMPTY_FILE,
        'The selected file is empty. Please choose a file with data.',
        `File size: ${file.size} bytes`
      )
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.FILE_TOO_LARGE,
        `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        `File size: ${file.size} bytes, limit: ${MAX_FILE_SIZE} bytes`
      )
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.INVALID_FILE_FORMAT,
        `Unsupported file format. Please upload ${SUPPORTED_EXTENSIONS.join(', ')} files only.`,
        `File extension: ${extension}`
      )
    };
  }

  // Check MIME type for additional validation
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv'
  ];

  if (file.type && !validMimeTypes.includes(file.type)) {
    console.warn(`[FILE VALIDATION] Unexpected MIME type: ${file.type}, but extension is valid`);
  }

  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type || 'unknown'
    }
  };
};

export const validatePayeeData = (data: any[], selectedColumn: string): FileValidationResult => {
  console.log(`[PAYEE VALIDATION] Validating ${data.length} rows for column: ${selectedColumn}`);

  if (!data || data.length === 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.EMPTY_FILE,
        'The file appears to be empty or has no data rows.',
        `Rows found: ${data.length}`
      )
    };
  }

  if (data.length > MAX_ROWS) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.FILE_TOO_LARGE,
        `Too many rows (${data.length}). Maximum allowed is ${MAX_ROWS} payee names.`,
        `Rows: ${data.length}, limit: ${MAX_ROWS}`
      )
    };
  }

  // Extract and validate payee names
  const payeeNames = data
    .map(row => {
      const value = row[selectedColumn];
      return typeof value === 'string' ? value.trim() : String(value || '').trim();
    })
    .filter(name => name.length > 0);

  if (payeeNames.length === 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.NO_VALID_PAYEES,
        `No valid payee names found in the "${selectedColumn}" column. Please check your data and column selection.`,
        `Total rows: ${data.length}, valid payees: ${payeeNames.length}`
      )
    };
  }

  // Check for reasonable minimum
  if (payeeNames.length < 1) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.NO_VALID_PAYEES,
        'At least one valid payee name is required for processing.',
        `Valid payees found: ${payeeNames.length}`
      )
    };
  }

  // Remove duplicates and count
  const uniquePayees = [...new Set(payeeNames)];
  const duplicateCount = payeeNames.length - uniquePayees.length;

  console.log(`[PAYEE VALIDATION] Found ${payeeNames.length} total payees, ${uniquePayees.length} unique, ${duplicateCount} duplicates`);

  return {
    isValid: true,
    fileInfo: {
      name: 'payee-data',
      size: data.length,
      type: 'payee-list',
      rowCount: data.length,
      columnCount: Object.keys(data[0] || {}).length
    }
  };
};

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

export const parseUploadedFile = async (file: File, headersOnly: boolean = false): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('No data found in file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (headersOnly) {
          // Get only the header row
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          const headers: string[] = [];
          
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
            const cell = worksheet[cellAddress];
            headers.push(cell ? String(cell.v) : `Column ${col + 1}`);
          }
          
          resolve(headers);
        } else {
          // Get all data
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('File is empty'));
            return;
          }

          // Convert array format to object format
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = (row as any[])[index] || '';
            });
            return obj;
          });
          
          resolve(rows);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsBinaryString(file);
  });
};
