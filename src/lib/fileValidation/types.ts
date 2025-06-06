
export interface ValidationResult {
  payeeNames: string[];
  originalData: any[];
  payeeColumnName?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: Error;
  fileType?: 'csv' | 'excel';
  size?: number;
}

export interface DataValidationResult {
  isValid: boolean;
  error?: Error;
  rowCount?: number;
  payeeCount?: number;
}
