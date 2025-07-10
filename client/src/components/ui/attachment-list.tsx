import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Trash2, FileText, Image, Eye } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';

interface Attachment {
  id: number;
  problemReportId: number;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: number;
  createdAt: string;
  uploadedByFirstName?: string;
  uploadedByLastName?: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onDownload: (attachment: Attachment) => void;
  onDelete?: (attachment: Attachment) => void;
  canDelete?: boolean;
  className?: string;
}

export function AttachmentList({ 
  attachments, 
  onDownload, 
  onDelete, 
  canDelete = false,
  className 
}: AttachmentListProps) {
  const [previewImage, setPreviewImage] = useState<Attachment | null>(null);
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  if (attachments.length === 0) {
    return (
      <div className={cn("text-center py-4 text-muted-foreground", className)}>
        <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No attachments</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Attachments ({attachments.length})
      </h4>
      
      {attachments.map((attachment) => (
        <Card key={attachment.id} className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(attachment.fileType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={attachment.originalName}>
                    {attachment.originalName}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span>
                      Uploaded by {attachment.uploadedByFirstName} {attachment.uploadedByLastName}
                    </span>
                    <span>{formatDateTime(attachment.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {isImage(attachment.fileType) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewImage(attachment)}
                    className="h-8 w-8 p-0"
                    title="View image"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(attachment)}
                  className="h-8 w-8 p-0"
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                {canDelete && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(attachment)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    title="Delete attachment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Image Preview Dialog */}
      {previewImage && (
        <ImagePreviewDialog
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageSrc={`/api/problem-reports/${previewImage.problemReportId}/attachments/${previewImage.id}/download`}
          imageAlt={previewImage.originalName}
          title={previewImage.originalName}
          onDownload={() => onDownload(previewImage)}
        />
      )}
    </div>
  );
}