import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  assetTag?: string;
  includeLabel?: boolean;
  includeBorder?: boolean;
  className?: string;
}

export function QrCodeDisplay({ 
  value, 
  size = 200, 
  label,
  assetTag,
  includeLabel = true,
  includeBorder = true,
  className = ''
}: QrCodeDisplayProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!value) return;
    
    const generateQrCode = async () => {
      try {
        setIsLoading(true);
        const dataUrl = await QRCode.toDataURL(value, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generateQrCode();
  }, [value, size]);
  
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <Skeleton className={`rounded-md ${includeBorder ? 'border border-border' : ''}`} style={{ width: size, height: size }} />
        {includeLabel && <Skeleton className="h-4 w-3/4 mt-2" />}
      </div>
    );
  }
  
  const containerClass = includeBorder 
    ? `bg-white p-3 rounded-md border border-border shadow-sm ${className}`
    : `${className}`;

  return (
    <div className={`flex flex-col items-center ${containerClass}`}>
      {qrCodeDataUrl ? (
        <img 
          src={qrCodeDataUrl} 
          alt={`QR Code for ${label || value}`}
          width={size}
          height={size}
          className="rounded-sm"
        />
      ) : (
        <div 
          className="flex items-center justify-center bg-muted" 
          style={{ width: size, height: size }}
        >
          QR Code Generation Failed
        </div>
      )}
      
      {includeLabel && (
        <div className="mt-2 text-center">
          {label && <div className="font-medium text-sm">{label}</div>}
          {assetTag && <div className="text-xs text-muted-foreground mt-1">{assetTag}</div>}
          <div className="font-mono text-xs mt-1 text-muted-foreground">{value}</div>
        </div>
      )}
    </div>
  );
}