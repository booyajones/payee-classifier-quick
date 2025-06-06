
import { FileValidationError } from '../errorHandler';

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
