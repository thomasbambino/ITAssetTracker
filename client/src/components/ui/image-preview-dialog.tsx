import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
  onDownload?: () => void;
  title?: string;
}

export function ImagePreviewDialog({ 
  isOpen, 
  onClose, 
  imageSrc, 
  imageAlt, 
  onDownload,
  title = "Image Preview"
}: ImagePreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="p-4 pt-0">
          <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              style={{ minHeight: '200px' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}