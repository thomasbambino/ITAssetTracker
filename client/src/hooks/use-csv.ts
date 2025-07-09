import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseCsvOptions {
  url: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface CsvResponse {
  message: string;
  users?: any[];
  devices?: any[];
}

export function useCsvImport(options: UseCsvOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const uploadCsv = async (file: File) => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    
    try {
      const response = await fetch(options.url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error: ${response.status}`);
      }
      
      const data: CsvResponse = await response.json();
      
      toast({
        title: "Success",
        description: data.message,
      });
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred during upload";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
      
      throw error;
    } finally {
      setIsUploading(false);
    }
  };
  
  return {
    uploadCsv,
    isUploading,
  };
}

export function useCsvExport(url: string) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const exportCsv = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Create a download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'export.csv';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "File exported successfully",
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred during export";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsExporting(false);
    }
  };
  
  return {
    exportCsv,
    isExporting,
  };
}
