
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ColumnSelectorProps {
  columns: string[];
  selectedColumn: string;
  onColumnChange: (value: string) => void;
  fileInfo: { rowCount?: number; payeeCount?: number } | null;
}

const ColumnSelector = ({ columns, selectedColumn, onColumnChange, fileInfo }: ColumnSelectorProps) => {
  if (columns.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor="column-select">Select column with payee names</Label>
      <Select value={selectedColumn} onValueChange={onColumnChange}>
        <SelectTrigger id="column-select">
          <SelectValue placeholder="Select a column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((column) => (
            <SelectItem key={column} value={column}>
              {column}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fileInfo && selectedColumn && (
        <p className="text-xs text-muted-foreground">
          Found {fileInfo.rowCount} rows, {fileInfo.payeeCount} unique payee names. Original data with {columns.length} columns will be preserved with enhanced row index tracking.
        </p>
      )}
    </div>
  );
};

export default ColumnSelector;
