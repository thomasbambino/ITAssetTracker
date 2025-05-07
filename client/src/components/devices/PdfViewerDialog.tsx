import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadIcon, X } from "lucide-react";

interface PdfViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: number;
  fileName: string;
}

export function PdfViewerDialog({ isOpen, onClose, deviceId, fileName }: PdfViewerDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && deviceId) {
      // Create the URL for viewing the PDF
      setPdfUrl(`/api/devices/${deviceId}/invoice/view`);
    }
  }, [isOpen, deviceId]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = `/api/devices/${deviceId}/invoice`;
    a.download = fileName || 'invoice';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle>Invoice: {fileName}</DialogTitle>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              className="flex items-center gap-1"
            >
              <DownloadIcon className="h-4 w-4" />
              Download
            </Button>
            <DialogClose className="rounded-full hover:bg-slate-100 p-1">
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 mt-4">
          {pdfUrl && (
            <iframe 
              src={pdfUrl}
              className="w-full h-full border border-gray-200 rounded-md"
              title="PDF Viewer"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}