
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

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const downloadCSV = (results: PayeeClassification[]) => {
  const csvData = results.map(result => ({
    'Payee Name': result.payeeName,
    'Classification': result.result.classification,
    'Confidence': result.result.confidence,
    'Reasoning': result.result.reasoning,
    'Processing Tier': result.result.processingTier,
    'Timestamp': formatDate(result.timestamp)
  }));

  const csv = [
    Object.keys(csvData[0]).join(','),
    ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'classification-results.csv';
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadJSON = (results: PayeeClassification[]) => {
  const json = JSON.stringify(results, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'classification-results.json';
  a.click();
  URL.revokeObjectURL(url);
};
