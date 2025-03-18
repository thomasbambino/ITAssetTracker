import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { useCsvImport } from '@/hooks/use-csv';
import { UploadIcon } from 'lucide-react';

interface CsvImportProps {
  url: string;
  entityName: string;
  onSuccess?: (data: any) => void;
  buttonVariant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonText?: string;
  icon?: boolean;
  templateUrl?: string;
}

export function CsvImport({
  url,
  entityName,
  onSuccess,
  buttonVariant = "outline",
  buttonSize = "default",
  buttonText,
  icon = true,
  templateUrl
}: CsvImportProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadCsv, isUploading } = useCsvImport({
    url,
    onSuccess: (data) => {
      setOpen(false);
      setFile(null);
      if (onSuccess) onSuccess(data);
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (file) {
      await uploadCsv(file);
    }
  };
  
  const handleReset = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const downloadTemplate = () => {
    if (templateUrl) {
      window.open(templateUrl, '_blank');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          {icon && <UploadIcon className="h-4 w-4 mr-2" />}
          {buttonText || `Import ${entityName}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import {entityName} from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import {entityName.toLowerCase()}. Make sure your CSV file has the required fields.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-sm text-gray-500">
                Selected file: {file.name}
              </p>
            )}
          </div>
          
          {templateUrl && (
            <div className="text-sm text-gray-500">
              <Button 
                variant="link" 
                className="h-auto p-0 text-primary-600"
                onClick={downloadTemplate}
              >
                Download template CSV
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={!file || isUploading}
          >
            Reset
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
