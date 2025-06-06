
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PayeeClassification, ClassificationResult } from "@/lib/types"
import * as XLSX from 'xlsx'

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
