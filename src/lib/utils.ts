
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PayeeClassification, ClassificationResult } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createPayeeClassification(
  payeeName: string, 
  result: ClassificationResult,
  originalData?: any,
  rowIndex?: number
): PayeeClassification {
  return {
    id: `payee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    payeeName,
    result,
    timestamp: new Date(),
    originalData, // Include original row data
    rowIndex // Include row index for proper ordering
  };
}
