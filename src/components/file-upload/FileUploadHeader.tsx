
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const FileUploadHeader = () => {
  return (
    <CardHeader>
      <CardTitle>Upload File for Batch Processing</CardTitle>
      <CardDescription>
        Upload an Excel or CSV file containing payee names for AI-powered classification with perfect data alignment.
      </CardDescription>
    </CardHeader>
  );
};

export default FileUploadHeader;
