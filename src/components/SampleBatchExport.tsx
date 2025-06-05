
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportResultsWithOriginalDataV3 } from "@/lib/classification/batchExporter";
import { BatchProcessingResult, PayeeClassification } from "@/lib/types";
import * as XLSX from 'xlsx';

const SampleBatchExport = () => {
  const generateSampleData = () => {
    // Sample original file data (what user uploaded)
    const originalFileData = [
      {
        "Payee_Name": "ABC Construction LLC",
        "Amount": 1500.00,
        "Date": "2024-01-15",
        "Invoice_Number": "INV-001",
        "Category": "Construction"
      },
      {
        "Payee_Name": "John Smith",
        "Amount": 750.50,
        "Date": "2024-01-16", 
        "Invoice_Number": "INV-002",
        "Category": "Consulting"
      },
      {
        "Payee_Name": "Medical Supplies Inc",
        "Amount": 2200.00,
        "Date": "2024-01-17",
        "Invoice_Number": "INV-003",
        "Category": "Medical"
      }
    ];

    // Sample classification results
    const results: PayeeClassification[] = [
      {
        id: "1",
        payeeName: "ABC Construction LLC",
        result: {
          classification: "Business",
          confidence: 95,
          reasoning: "LLC suffix indicates business entity",
          processingTier: "Rule-Based",
          matchingRules: ["Business suffix rule"],
          keywordExclusion: {
            isExcluded: false,
            matchedKeywords: [],
            confidence: 0,
            reasoning: "No exclusion keywords found"
          },
          processingMethod: "Enhanced Classification V3",
          similarityScores: {
            levenshtein: 0.95,
            jaroWinkler: 0.92,
            dice: 0.88,
            tokenSort: 0.90,
            combined: 0.91
          }
        },
        timestamp: new Date(),
        rowIndex: 0
      },
      {
        id: "2", 
        payeeName: "John Smith",
        result: {
          classification: "Individual",
          confidence: 85,
          reasoning: "First name + Last name pattern indicates individual",
          processingTier: "NLP-Based",
          matchingRules: ["Individual name pattern"],
          keywordExclusion: {
            isExcluded: false,
            matchedKeywords: [],
            confidence: 0,
            reasoning: "No exclusion keywords found"
          },
          processingMethod: "Enhanced Classification V3",
          similarityScores: {
            levenshtein: 0.87,
            jaroWinkler: 0.89,
            dice: 0.82,
            tokenSort: 0.85,
            combined: 0.86
          }
        },
        timestamp: new Date(),
        rowIndex: 1
      },
      {
        id: "3",
        payeeName: "Medical Supplies Inc", 
        result: {
          classification: "Business",
          confidence: 92,
          reasoning: "Inc suffix indicates business corporation",
          processingTier: "Rule-Based",
          matchingRules: ["Business suffix rule"],
          keywordExclusion: {
            isExcluded: true,
            matchedKeywords: ["medical"],
            confidence: 90,
            reasoning: "Contains medical keyword - excluded from processing"
          },
          processingMethod: "Enhanced Classification V3",
          similarityScores: {
            levenshtein: 0.93,
            jaroWinkler: 0.91,
            dice: 0.89,
            tokenSort: 0.92,
            combined: 0.91
          }
        },
        timestamp: new Date(),
        rowIndex: 2
      }
    ];

    const batchResult: BatchProcessingResult = {
      results,
      successCount: 3,
      failureCount: 0,
      originalFileData,
      processingTime: 1250
    };

    return batchResult;
  };

  const handleGenerateAndExport = () => {
    const sampleBatch = generateSampleData();
    const exportData = exportResultsWithOriginalDataV3(sampleBatch, true);
    
    console.log("Sample Export Data Structure:", exportData);
    
    // Create Excel file
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Enhanced Results");
    
    const filename = `sample_enhanced_payee_classification.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const handleShowStructure = () => {
    const sampleBatch = generateSampleData();
    const exportData = exportResultsWithOriginalDataV3(sampleBatch, true);
    
    console.log("=== SAMPLE EXPORT DATA STRUCTURE ===");
    console.log("Number of rows:", exportData.length);
    console.log("Columns in first row:", Object.keys(exportData[0]));
    console.log("First row data:", exportData[0]);
    console.log("Second row data:", exportData[1]);
    console.log("Third row data:", exportData[2]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Sample Batch Export Preview</CardTitle>
        <CardDescription>
          This shows you exactly what your exported data will look like with original file data plus classification results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Button onClick={handleShowStructure}>
            Show Export Structure in Console
          </Button>
          <Button onClick={handleGenerateAndExport}>
            Download Sample Excel File
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <h4 className="font-medium mb-2">Export will include:</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Original file columns:</strong> Payee_Name, Amount, Date, Invoice_Number, Category</li>
            <li><strong>Classification fields:</strong> Classification, Confidence_%, Processing_Tier, Reasoning</li>
            <li><strong>Keyword exclusion fields:</strong> Matched_Keywords, Keyword_Exclusion, Keyword_Confidence, Keyword_Reasoning</li>
            <li><strong>Similarity scores:</strong> Levenshtein_Score, Jaro_Winkler_Score, Dice_Coefficient, Token_Sort_Ratio, Combined_Similarity</li>
            <li><strong>Metadata:</strong> Processing_Method, Matching_Rules, Timestamp</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SampleBatchExport;
