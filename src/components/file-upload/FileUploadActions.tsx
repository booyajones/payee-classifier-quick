
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";

interface FileUploadActionsProps {
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
  isProcessButtonDisabled: boolean;
  onProcess: () => void;
  onReset: () => void;
}

const FileUploadActions = ({ 
  isLoading, 
  isRetrying, 
  retryCount, 
  isProcessButtonDisabled, 
  onProcess, 
  onReset 
}: FileUploadActionsProps) => {
  return (
    <div className="flex gap-2">
      <Button 
        type="button" 
        className="flex-1" 
        disabled={isProcessButtonDisabled}
        onClick={onProcess}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {isRetrying ? `Retrying (${retryCount + 1})...` : "Creating Job..."}
          </>
        ) : (
          "Submit File for Processing"
        )}
      </Button>
      
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={isLoading}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Clear
      </Button>
    </div>
  );
};

export default FileUploadActions;
