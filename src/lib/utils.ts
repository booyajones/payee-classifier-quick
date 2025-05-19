
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";
import { PayeeClassification, ClassificationResult } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUniqueId(): string {
  return uuidv4();
}

export function createPayeeClassification(
  payeeName: string,
  result: ClassificationResult
): PayeeClassification {
  return {
    id: generateUniqueId(),
    payeeName,
    result,
    timestamp: new Date(),
  };
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function downloadCSV(data: PayeeClassification[]): void {
  // Create CSV content
  const headers = ['Payee Name', 'Classification', 'Confidence', 'Processing Tier', 'Reasoning'];
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      `"${item.payeeName.replace(/"/g, '""')}"`,
      item.result.classification,
      item.result.confidence,
      item.result.processingTier,
      `"${item.result.reasoning.replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `payee-classifications-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadJSON(data: PayeeClassification[]): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `payee-classifications-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const examplePayees = [
  "John Smith",
  "ABC Corporation",
  "Smith & Sons LLC",
  "Dr. Jane Wilson",
  "First National Bank",
  "City of Springfield",
  "Johnson Plumbing Services",
  "Acme Industries, Inc.",
  "Robert Brown CPA",
  "Northeast Medical Center",
  "Sarah Miller",
  "Miller Property Management",
  "Green Valley School District",
  "Thomas Garcia MD",
  "Garcia's Auto Repair"
];
