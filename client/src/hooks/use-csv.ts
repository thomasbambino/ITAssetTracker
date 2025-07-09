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
      // Use window.open to trigger the download directly
      // This approach works consistently across browsers
      window.open(url, '_blank');
      
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
