import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { QrCode as QrCodeIcon, Download, Plus, Printer, Smartphone, Clock, CheckCircle, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { QrCodeForm } from "@/components/forms/QrCodeForm";
import { QrCodeScanner } from "@/components/qrcodes/QrCodeScanner";
import { QrCodeDisplay } from "@/components/qrcodes/QrCodeDisplay";
import { PageContainer } from "@/components/layout/PageContainer";

// Define the QR code type based on our schema
interface QrCode {
  id: number;
  deviceId: number;
  code: string;
  createdAt: Date | null;
  lastScanned: Date | null;
  scanCount: number;
  device?: {
    id: number;
    brand: string;
    model: string;
    assetTag: string;
  };
}

export default function QrCodesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isScannerDialogOpen, setIsScannerDialogOpen] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState<QrCode | null>(null);
  
  // Query for fetching all QR codes
  const { data: qrCodes = [], isLoading: isQrCodesLoading } = useQuery({
    queryKey: ['/api/qrcodes'],
  });

  const columns = [
    {
      header: "Device",
      accessor: (qrCode: QrCode) => qrCode.device ? 
        `${qrCode.device.brand} ${qrCode.device.model} (${qrCode.device.assetTag})` : 
        "Unknown Device",
    },
    {
      header: "QR Code",
      accessor: "code",
      cell: (qrCode: QrCode) => (
        <div className="font-mono text-xs truncate max-w-[200px]">{qrCode.code}</div>
      )
    },
    {
      header: "Created",
      accessor: (qrCode: QrCode) => qrCode.createdAt ? formatDate(qrCode.createdAt) : "Unknown"
    },
    {
      header: "Last Scanned",
      accessor: (qrCode: QrCode) => qrCode.lastScanned ? formatDate(qrCode.lastScanned) : "Never",
      cell: (qrCode: QrCode) => {
        if (!qrCode.lastScanned) {
          return <span className="text-muted-foreground">Never</span>;
        }
        
        return (
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
            {formatDate(qrCode.lastScanned)}
          </div>
        );
      }
    },
    {
      header: "Scan Count",
      accessor: "scanCount",
      cell: (qrCode: QrCode) => (
        <Badge variant="outline" className="bg-primary/10">
          {qrCode.scanCount}
        </Badge>
      )
    },
  ];

  const handleQrCodeFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setSelectedQrCode(null);
    // Invalidate queries to refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/qrcodes'] });
  };

  const handleScanSuccess = (code: string) => {
    // Record the scan
    fetch(`/api/qrcodes/code/${code}/scan`, { method: 'POST' })
      .then(response => {
        if (response.ok) {
          // Invalidate queries to refresh the list
          queryClient.invalidateQueries({ queryKey: ['/api/qrcodes'] });
          setIsScannerDialogOpen(false);
        }
      })
      .catch(error => {
        console.error("Error recording QR code scan:", error);
      });
  };

  const [isQrDetailsOpen, setIsQrDetailsOpen] = useState(false);
  
  const handleViewDetails = (qrCode: QrCode) => {
    setSelectedQrCode(qrCode);
    setIsQrDetailsOpen(true);
  };
  
  const handlePrintClick = (qrCode: QrCode) => {
    // First view details, then user can print from there
    handleViewDetails(qrCode);
  };

  const handleDownloadClick = (qrCode: QrCode) => {
    // First view details, then user can download from there
    handleViewDetails(qrCode);
  };
  
  // Function to download the QR code as an image
  const downloadQrCode = () => {
    if (!selectedQrCode) return;
    
    const qrCodeImg = document.getElementById('qr-code-img') as HTMLImageElement;
    if (!qrCodeImg || !qrCodeImg.src) return;
    
    // Create an anchor element and set the download attributes
    const link = document.createElement('a');
    link.href = qrCodeImg.src;
    link.download = `qrcode-${selectedQrCode.code}.png`;
    
    // Programmatically click the link to trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Function to print the QR code
  const printQrCode = () => {
    if (!selectedQrCode) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const deviceInfo = selectedQrCode.device 
      ? `${selectedQrCode.device.brand} ${selectedQrCode.device.model} (${selectedQrCode.device.assetTag})`
      : 'Unknown Device';
    
    // Generate HTML content for the print window
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Print - ${selectedQrCode.code}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 20px; }
            .qr-container { margin: 20px auto; max-width: 300px; }
            .qr-code { width: 100%; height: auto; }
            .device-info { margin-top: 10px; font-weight: bold; }
            .qr-code-text { font-family: monospace; margin-top: 5px; color: #666; }
            @media print {
              body { margin: 0; padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${(document.getElementById('qr-code-img') as HTMLImageElement)?.src}" class="qr-code" />
            <div class="device-info">${deviceInfo}</div>
            <div class="qr-code-text">${selectedQrCode.code}</div>
          </div>
          <button onclick="window.print(); setTimeout(() => window.close(), 500);">Print</button>
        </body>
      </html>
    `;
    
    // Write the HTML to the new window and trigger print
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const pageActions = (
    <div className="flex space-x-2">
      <Dialog open={isScannerDialogOpen} onOpenChange={setIsScannerDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Smartphone className="h-4 w-4 mr-2" /> Scan QR Code
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Use your camera to scan a QR code. This will record the scan in the system.
            </DialogDescription>
          </DialogHeader>
          <QrCodeScanner onScanSuccess={handleScanSuccess} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Create QR Code
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create QR Code</DialogTitle>
            <DialogDescription>
              Generate a QR code for a device that you can print and attach to the equipment.
            </DialogDescription>
          </DialogHeader>
          <QrCodeForm onSuccess={handleQrCodeFormSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <PageContainer
      title="QR Code Management"
      description="Generate and manage QR codes for your IT assets"
      actions={pageActions}
    >
      
      <Card>
        <CardHeader>
          <CardTitle>QR Code Library</CardTitle>
          <CardDescription>
            Manage QR codes for your IT assets. You can print or download these to attach to your equipment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={qrCodes}
            columns={columns}
            keyField="id"
            loading={isQrCodesLoading}
            searchable
            actions={[
              {
                label: "Print",
                onClick: handlePrintClick,
                icon: <Printer className="h-4 w-4" />
              },
              {
                label: "Download",
                onClick: handleDownloadClick,
                icon: <Download className="h-4 w-4" />
              }
            ]}
            emptyState={
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <QrCodeIcon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium mb-2">No QR Codes Found</p>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  QR codes help you quickly identify and track assets. Generate QR codes for your devices to streamline inventory management.
                </p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First QR Code
                </Button>
              </div>
            }
          />
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <QrCodeIcon className="h-4 w-4" />
            <p>QR codes can be scanned using the built-in scanner or any standard QR code scanning app</p>
          </div>
        </CardFooter>
      </Card>
      
      {/* QR Code Details Dialog */}
      <Dialog open={isQrDetailsOpen} onOpenChange={setIsQrDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedQrCode && (
            <>
              <DialogHeader>
                <DialogTitle>QR Code Details</DialogTitle>
                <DialogDescription>
                  {selectedQrCode.device ? (
                    <>
                      For {selectedQrCode.device.brand} {selectedQrCode.device.model} 
                      ({selectedQrCode.device.assetTag})
                    </>
                  ) : (
                    "Details for this QR code"
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col items-center justify-center py-4">
                {/* QR Code Display */}
                <div className="bg-white p-6 rounded-md shadow-sm mb-4">
                  <QrCodeDisplay 
                    value={selectedQrCode.code}
                    size={200}
                    label={selectedQrCode.device?.assetTag || ''}
                    assetTag={selectedQrCode.device ? `${selectedQrCode.device.brand} ${selectedQrCode.device.model}` : ''}
                    id="qr-code-img"
                  />
                </div>
                
                {/* QR Code Information */}
                <div className="w-full space-y-3 mb-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Code:</span>
                    <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{selectedQrCode.code}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Created:</span>
                    <span className="text-sm">{selectedQrCode.createdAt ? formatDate(selectedQrCode.createdAt) : "Unknown"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Last Scanned:</span>
                    <span className="text-sm">{selectedQrCode.lastScanned ? formatDate(selectedQrCode.lastScanned) : "Never"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Scan Count:</span>
                    <Badge variant="outline" className="bg-primary/10">{selectedQrCode.scanCount}</Badge>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={printQrCode}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadQrCode}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}