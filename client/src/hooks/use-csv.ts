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
      // Use a direct window approach to handle the export
      // This bypasses any frontend routing issues
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = url;
      form.style.display = 'none';
      document.body.appendChild(form);
      
      // Create an iframe to handle the response
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.name = 'export-frame';
      form.target = 'export-frame';
      document.body.appendChild(iframe);
      
      // Set up event handlers
      return new Promise<boolean>((resolve) => {
        let resolved = false;
        
        const cleanup = () => {
          if (form.parentNode) form.parentNode.removeChild(form);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          resolved = true;
        };
        
        iframe.onload = () => {
          if (resolved) return;
          
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc) {
              const content = doc.documentElement.innerHTML;
              
              // Check if we got an HTML error page (authentication failure)
              if (content.includes('<!DOCTYPE html>')) {
                toast({
                  title: "Authentication Required",
                  description: "Please log in to export data",
                  variant: "destructive",
                });
                cleanup();
                setIsExporting(false);
                resolve(false);
                return;
              }
            }
            
            // If we get here, the download should have worked
            toast({
              title: "Success",
              description: "File exported successfully",
            });
            cleanup();
            setIsExporting(false);
            resolve(true);
          } catch (error) {
            // Cross-origin error is expected for successful downloads
            toast({
              title: "Success",
              description: "File exported successfully",
            });
            cleanup();
            setIsExporting(false);
            resolve(true);
          }
        };
        
        iframe.onerror = () => {
          if (resolved) return;
          toast({
            title: "Error",
            description: "Failed to export data",
            variant: "destructive",
          });
          cleanup();
          setIsExporting(false);
          resolve(false);
        };
        
        // Fallback timeout
        setTimeout(() => {
          if (!resolved) {
            toast({
              title: "Success",
              description: "File exported successfully",
            });
            cleanup();
            setIsExporting(false);
            resolve(true);
          }
        }, 3000);
        
        // Submit the form
        form.submit();
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred during export";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      setIsExporting(false);
      return false;
    }
  };
  
  return {
    exportCsv,
    isExporting,
  };
}
