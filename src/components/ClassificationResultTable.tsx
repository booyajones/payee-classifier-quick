
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayeeClassification } from "@/lib/types";
import ClassificationBadge from "./ClassificationBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Download } from "lucide-react";
import { downloadCSV, downloadJSON } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ClassificationResultTableProps {
  results: PayeeClassification[];
}

type SortField = 'payeeName' | 'classification' | 'confidence' | 'processingTier';
type SortDirection = 'asc' | 'desc';

const ClassificationResultTable = ({ results }: ClassificationResultTableProps) => {
  const [sortField, setSortField] = useState<SortField>('payeeName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedResult, setSelectedResult] = useState<PayeeClassification | null>(null);
  
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedResults = [...results].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'payeeName':
        comparison = a.payeeName.localeCompare(b.payeeName);
        break;
      case 'classification':
        comparison = a.result.classification.localeCompare(b.result.classification);
        break;
      case 'confidence':
        comparison = a.result.confidence - b.result.confidence;
        break;
      case 'processingTier':
        comparison = a.result.processingTier.localeCompare(b.result.processingTier);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  const sortIcon = (field: SortField) => {
    if (field === sortField) {
      return sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />;
    }
    return null;
  };
  
  return (
    <div>
      <div className="flex justify-end mb-4 gap-2">
        <Button variant="outline" size="sm" onClick={() => downloadCSV(results)}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadJSON(results)}>
          <Download className="w-4 h-4 mr-2" /> Export JSON
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('payeeName')}>
                Payee Name {sortIcon('payeeName')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('classification')}>
                Classification {sortIcon('classification')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('confidence')}>
                Confidence {sortIcon('confidence')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('processingTier')}>
                Processing Tier {sortIcon('processingTier')}
              </TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.map((result) => (
              <TableRow key={result.id}>
                <TableCell className="font-medium">{result.payeeName}</TableCell>
                <TableCell>
                  <Badge variant={result.result.classification === 'Business' ? 'default' : 'secondary'}>
                    {result.result.classification}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ClassificationBadge confidence={result.result.confidence} />
                </TableCell>
                <TableCell>{result.result.processingTier}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedResult(result)}>
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedResult} onOpenChange={(open) => !open && setSelectedResult(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedResult && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedResult.payeeName}</DialogTitle>
                <DialogDescription>Classification Details</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex justify-between">
                  <span className="font-medium">Classification:</span>
                  <Badge variant={selectedResult.result.classification === 'Business' ? 'default' : 'secondary'}>
                    {selectedResult.result.classification}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Confidence:</span>
                  <ClassificationBadge confidence={selectedResult.result.confidence} />
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Processing Tier:</span>
                  <span>{selectedResult.result.processingTier}</span>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Reasoning:</h4>
                  <p className="text-sm">{selectedResult.result.reasoning}</p>
                </div>
                
                {selectedResult.result.matchingRules && selectedResult.result.matchingRules.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">Matching Rules:</h4>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {selectedResult.result.matchingRules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassificationResultTable;
