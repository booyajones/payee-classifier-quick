
interface ValidationErrorDisplayProps {
  fileError: string | null;
}

const ValidationErrorDisplay = ({ fileError }: ValidationErrorDisplayProps) => {
  if (!fileError) return null;

  return (
    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
      <p className="text-sm text-destructive font-medium">Validation Error</p>
      <p className="text-sm text-destructive/80 mt-1">
        {fileError}
      </p>
    </div>
  );
};

export default ValidationErrorDisplay;
