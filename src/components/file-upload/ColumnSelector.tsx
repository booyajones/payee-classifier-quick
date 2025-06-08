
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
      <Label htmlFor="column-select">Payee column</Label>
      <Select value={selectedColumn} onValueChange={onColumnChange}>
        <SelectTrigger id="column-select">
          <SelectValue placeholder="Select column" />
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
          {fileInfo.rowCount} rows, {fileInfo.payeeCount} unique payees
        </p>
      )}
    </div>
  );
};

export default ColumnSelector;
