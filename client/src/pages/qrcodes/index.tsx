import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Plus, Printer, Smartphone, Clock, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { QrCodeForm } from "@/components/forms/QrCodeForm";
import { QrCodeScanner } from "@/components/qrcodes/QrCodeScanner";

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

  const handlePrintClick = (qrCode: QrCode) => {
    // Generate a printable version (in a real implementation, this would open a print dialog)
    console.log("Print QR code:", qrCode);
    
    // For this demo, we'll just show an alert
    window.alert("In a production environment, this would generate a printable version of the QR code.");
  };

  const handleDownloadClick = (qrCode: QrCode) => {
    // Generate a downloadable version (in a real implementation, this would trigger a download)
    console.log("Download QR code:", qrCode);
    
    // For this demo, we'll just show an alert
    window.alert("In a production environment, this would generate a downloadable version of the QR code.");
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">QR Code Management</h1>
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
      </div>
      
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
                  <QrCode className="h-8 w-8 text-primary" />
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
            <QrCode className="h-4 w-4" />
            <p>QR codes can be scanned using the built-in scanner or any standard QR code scanning app</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}