
import { toast } from "@/hooks/use-toast";

export interface AppError {
  code: string;
  message: string;
  details?: string;
  retryable?: boolean;
}

export class BatchProcessingError extends Error implements AppError {
  code: string;
  details?: string;
  retryable: boolean;

  constructor(code: string, message: string, details?: string, retryable = false) {
    super(message);
    this.name = 'BatchProcessingError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export class FileValidationError extends Error implements AppError {
  code: string;
  details?: string;
  retryable: boolean;

  constructor(code: string, message: string, details?: string, retryable = false) {
    super(message);
    this.name = 'FileValidationError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export const ERROR_CODES = {
  BATCH_CREATION_FAILED: 'BATCH_CREATION_FAILED',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  EMPTY_FILE: 'EMPTY_FILE',
  NO_VALID_PAYEES: 'NO_VALID_PAYEES',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  JOB_EXPIRED: 'JOB_EXPIRED',
  PARSING_ERROR: 'PARSING_ERROR'
} as const;

export const handleError = (error: unknown, context?: string): AppError => {
  console.error(`[ERROR HANDLER] ${context || 'Unknown context'}:`, error);

  if (error instanceof BatchProcessingError || error instanceof FileValidationError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle specific error patterns
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return new BatchProcessingError(
        ERROR_CODES.API_QUOTA_EXCEEDED,
        'API quota exceeded. Please try again later.',
        error.message,
        true
      );
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new BatchProcessingError(
        ERROR_CODES.NETWORK_ERROR,
        'Network error occurred. Please check your connection and try again.',
        error.message,
        true
      );
    }

    if (error.message.includes('QuotaExceededError') || error.message.includes('storage quota')) {
      return new BatchProcessingError(
        ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
        'Local storage is full. Please clear some data and try again.',
        error.message,
        false
      );
    }

    // Generic error
    return new BatchProcessingError(
      'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred.',
      error.stack,
      false
    );
  }

  // Fallback for non-Error objects
  return new BatchProcessingError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred.',
    String(error),
    false
  );
};

export const showErrorToast = (error: AppError, context?: string) => {
  const title = context ? `${context} Error` : 'Error';
  
  toast({
    title,
    description: error.message,
    variant: "destructive",
  });

  // Log detailed error for debugging
  console.error(`[${error.code}] ${error.message}`, error.details);
};

export const showRetryableErrorToast = (
  error: AppError, 
  onRetry: () => void, 
  context?: string
) => {
  if (error.retryable) {
    toast({
      title: `${context || 'Operation'} Failed`,
      description: `${error.message} Click to retry.`,
      variant: "destructive",
      action: {
        label: "Retry",
        onClick: onRetry
      }
    });
  } else {
    showErrorToast(error, context);
  }
};
