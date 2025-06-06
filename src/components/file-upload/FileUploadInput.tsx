
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface FileUploadInputProps {
  file: File | null;
  validationStatus: 'none' | 'validating' | 'valid' | 'error';
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadInput = ({ file, validationStatus, onFileChange }: FileUploadInputProps) => {
  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="file-upload">Upload Excel or CSV file</Label>
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          variant="outline" 
          className="w-full"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={validationStatus === 'validating'}
        >
          <Upload className="h-4 w-4 mr-2" />
          {file ? 'Change File' : 'Select File'}
        </Button>
        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <File className="h-4 w-4" />
            <span>{file.name}</span>
            {getValidationIcon()}
          </div>
        )}
      </div>
      <input
        id="file-upload"
        type="file"
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={onFileChange}
      />
      <p className="text-xs text-muted-foreground">
        Accepted formats: Excel (.xlsx, .xls) or CSV files (max 50MB, 50,000 rows). All original columns will be preserved in the export.
      </p>
    </div>
  );
};

export default FileUploadInput;
