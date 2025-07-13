import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { QrCode as QrCodeIcon, Download, Plus, Printer, Smartphone, Clock, CheckCircle, Info, Trash } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QrCodeForm } from "@/components/forms/QrCodeForm";
import { QrCodeScanner } from "@/components/qrcodes/QrCodeScanner";
import { QrCodeDisplay } from "@/components/qrcodes/QrCodeDisplay";
import { PageContainer } from "@/components/layout/PageContainer";

// Define the QR code type based on our schema
interface QrCode {
  id: number;
  deviceId: number;
  code: string;
  createdAt: Date | null; // Field from the API response
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
  const { toast } = useToast();
  
  // Query for fetching all QR codes
  const { data: qrCodes = [], isLoading: isQrCodesLoading } = useQuery<QrCode[]>({
    queryKey: ['/api/qrcodes'],
  });
  
  // Query for fetching scan history for a specific QR code
  const { data: scanHistory = [], isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery({
    queryKey: [`/api/qrcodes/${selectedQrCode?.id}/history`],
    enabled: !!selectedQrCode, // Only fetch when a QR code is selected
    queryFn: async () => {
      if (!selectedQrCode) return [];
      const response = await fetch(`/api/qrcodes/${selectedQrCode.id}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch scan history');
      }
      return response.json();
    }
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
          return response.json();
        }
        throw new Error('Failed to record scan');
      })
      .then(qrCode => {
        // Invalidate queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/qrcodes'] });
        
        // Close scanner dialog
        setIsScannerDialogOpen(false);
        
        // Show success toast
        toast({
          title: "QR Code Scanned",
          description: "The QR code scan has been successfully recorded.",
          variant: "default",
        });
        
        // Navigate to the device details page
        if (qrCode && qrCode.deviceId) {
          window.location.href = `/devices/${qrCode.deviceId}`;
        }
      })
      .catch(error => {
        console.error("Error recording QR code scan:", error);
        toast({
          title: "Error",
          description: "Failed to record QR code scan. Please try again.",
          variant: "destructive",
        });
      });
  };

  const [isQrDetailsOpen, setIsQrDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details'); 
  
  const handleViewDetails = (qrCode: QrCode) => {
    setSelectedQrCode(qrCode);
    setIsQrDetailsOpen(true);
    // Reset to details tab whenever opening the dialog
    setActiveTab('details');
    // This will trigger the history fetch due to the useQuery dependency
  };
  
  const handlePrintClick = (qrCode: QrCode) => {
    // First view details, then user can print from there
    handleViewDetails(qrCode);
  };

  const handleDownloadClick = (qrCode: QrCode) => {
    // First view details, then user can download from there
    handleViewDetails(qrCode);
  };
  
  const handleDeleteClick = (qrCode: QrCode) => {
    if (window.confirm(`Are you sure you want to delete the QR code for ${qrCode.device ? `${qrCode.device.brand} ${qrCode.device.model} (${qrCode.device.assetTag})` : `device #${qrCode.deviceId}`}?`)) {
      fetch(`/api/qrcodes/${qrCode.id}`, { method: 'DELETE' })
        .then(response => {
          if (response.ok) {
            toast({
              title: "QR Code Deleted",
              description: "The QR code has been successfully deleted.",
              variant: "default",
            });
            // Refresh the list
            queryClient.invalidateQueries({ queryKey: ['/api/qrcodes'] });
          } else {
            throw new Error('Failed to delete QR code');
          }
        })
        .catch(error => {
          console.error("Error deleting QR code:", error);
          toast({
            title: "Error",
            description: "Failed to delete QR code. Please try again.",
            variant: "destructive",
          });
        });
    }
  };
  
  // Function to download the QR code as an image
  const downloadQrCode = () => {
    if (!selectedQrCode) return;
    
    const qrCodeImg = document.getElementById('qr-code-img') as HTMLImageElement;
    console.log('QR Code Image Element:', qrCodeImg);
    console.log('QR Code Image Source:', qrCodeImg?.src);
    
    if (!qrCodeImg || !qrCodeImg.src) {
      toast({
        title: "Error",
        description: "QR code image not found. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Create an anchor element and set the download attributes
    const link = document.createElement('a');
    link.href = qrCodeImg.src;
    link.download = `qrcode-${selectedQrCode.device?.assetTag || selectedQrCode.code}.png`;
    
    // Programmatically click the link to trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Success",
      description: "QR code downloaded successfully.",
    });
  };
  
  // Function to print the QR code
  const printQrCode = () => {
    if (!selectedQrCode) return;
    
    const qrCodeImg = document.getElementById('qr-code-img') as HTMLImageElement;
    if (!qrCodeImg || !qrCodeImg.src) {
      toast({
        title: "Error",
        description: "QR code image not found. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window. Please check your browser's popup settings.",
        variant: "destructive",
      });
      return;
    }
    
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
            .qr-code { width: 100%; height: auto; max-width: 250px; }
            .device-info { margin-top: 10px; font-weight: bold; font-size: 14px; }
            .qr-code-text { font-family: monospace; margin-top: 5px; color: #666; font-size: 12px; }
            @media print {
              body { margin: 0; padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrCodeImg.src}" class="qr-code" alt="QR Code" />
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
    
    toast({
      title: "Success",
      description: "Print dialog opened successfully.",
    });
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
              },
              {
                label: "Delete",
                onClick: handleDeleteClick,
                icon: <Trash className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-[550px]">
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
              
              {/* QR Code Display - Always visible in both tabs */}
              <div className="flex flex-col items-center justify-center pt-2 pb-4">
                <div className="bg-white p-6 rounded-md shadow-sm mb-2">
                  <QrCodeDisplay 
                    value={selectedQrCode.code}
                    size={180}
                    label={selectedQrCode.device?.assetTag || ''}
                    assetTag={selectedQrCode.device ? `${selectedQrCode.device.brand} ${selectedQrCode.device.model}` : ''}
                    id="qr-code-img"
                  />
                </div>
              </div>
              
              {/* Tabs for Details and History */}
              <Tabs defaultValue="details" value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'history')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="details" className="flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Scan History
                    {selectedQrCode.scanCount > 0 && (
                      <Badge variant="outline" className="ml-2 bg-primary/10">{selectedQrCode.scanCount}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="m-0">
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
                    
                    {selectedQrCode.device && (
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-sm font-medium">Device:</span>
                        <span className="text-sm">{selectedQrCode.device.brand} {selectedQrCode.device.model}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => {
                      // Add a small delay to ensure QR code is fully loaded
                      setTimeout(printQrCode, 100);
                    }}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      // Add a small delay to ensure QR code is fully loaded
                      setTimeout(downloadQrCode, 100);
                    }}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="m-0">
                  {isHistoryLoading ? (
                    <div className="py-8 text-center">
                      <div className="inline-flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading scan history...</p>
                    </div>
                  ) : scanHistory.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-2">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="font-medium">No Scan History</p>
                      <p className="text-sm text-muted-foreground mt-1">This QR code has not been scanned yet.</p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      <div className="space-y-3">
                        {scanHistory.map((scan: any) => (
                          <div key={scan.id} className="flex items-start border-b pb-3">
                            <div className="flex-shrink-0 mr-3 mt-1">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Smartphone className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium">Scanned</p>
                                  {scan.scannedBy ? (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      By {scan.scannedBy.name || `User #${scan.scannedBy.id}`}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground mt-1">By anonymous user</p>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDateTime(scan.timestamp)}
                                </p>
                              </div>
                              {scan.location && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Location: {scan.location}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}