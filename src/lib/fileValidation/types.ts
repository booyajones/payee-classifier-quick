
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
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    rowCount?: number;
    columnCount?: number;
  };
}

export interface DataValidationResult {
  isValid: boolean;
  error?: Error;
  rowCount?: number;
  payeeCount?: number;
}

export interface AppError extends Error {
  code: string;
}
