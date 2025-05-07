import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useParams, Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerDialog } from '@/components/devices/PdfViewerDialog';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeftIcon, 
  LaptopIcon, 
  TagIcon, 
  CreditCardIcon, 
  CalendarIcon,
  EditIcon,
  Trash2Icon,
  UserCheckIcon,
  UserIcon,
  InfoIcon,
  QrCodeIcon,
  DownloadIcon,
  PrinterIcon,
  FileIcon,
  FileTextIcon,
  MessageSquare,
  Wrench,
  CalendarClock,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate, daysFromNow } from '@/lib/utils';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { DeviceAssignmentDialog } from '@/components/devices/DeviceAssignmentDialog';
import { DeviceForm } from '@/components/forms/DeviceForm';
import { DataTable } from '@/components/ui/data-table';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QrCodeDisplay } from '@/components/qrcodes/QrCodeDisplay';

export default function DeviceDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isCommentsEditing, setIsCommentsEditing] = useState(false);
  const [commentsValue, setCommentsValue] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showQrCodeDialog, setShowQrCodeDialog] = useState(false);
  const [showPdfViewerDialog, setShowPdfViewerDialog] = useState(false);

  // Determine if we're in "new device" mode
  const isNewDevice = id === 'new';
  
  // Fetch device details
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${id}`],
    enabled: !isNewDevice && !!id,
  });
  
  // Initialize comments value when device data is available
  useEffect(() => {
    if (device) {
      setCommentsValue(device.notes || "");
    }
  }, [device]);
  
  // Fetch QR code for device
  const { data: qrCodeData, isLoading: qrCodeLoading } = useQuery({
    queryKey: [`/api/devices/${id}/qrcode`],
    enabled: !isNewDevice && !!id,
  });
  
  // Add reference to QR code image for download
  const qrCodeRef = useRef<HTMLImageElement | null>(null);
  
  // Create QR code mutation
  const createQrCodeMutation = useMutation({
    mutationFn: async () => {
      // Generate a unique code for the QR code
      const code = `DEV-${id}-${Date.now()}`;
      const response = await apiRequest({
        method: 'POST', 
        url: '/api/qrcodes', 
        data: {
          deviceId: Number(id),
          code: code
        }
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${id}/qrcode`] });
      toast({
        title: "Success",
        description: "QR code created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create QR code",
        variant: "destructive",
      });
    }
  });
  
  // Effect to update the hidden image element when QR code data is available
  useEffect(() => {
    if (qrCodeData && qrCodeRef.current) {
      // Find the QR code image in the DOM
      const displayedQrCode = document.getElementById('device-qrcode') as HTMLImageElement;
      if (displayedQrCode) {
        // Update our hidden image reference with the displayed QR code's source
        qrCodeRef.current.src = displayedQrCode.src;
      }
    }
  }, [qrCodeData]);
  
  // Function to handle downloading the QR code
  const handleQrCodeDownload = () => {
    if (!qrCodeData || !qrCodeRef.current) return;
    
    const link = document.createElement('a');
    link.href = qrCodeRef.current.src;
    link.download = `qrcode-${device.assetTag || device.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Success",
      description: "QR code downloaded successfully",
    });
  };
  
  // Function to handle printing the QR code
  const handleQrCodePrint = () => {
    if (!qrCodeData || !qrCodeRef.current) return;
    
    const printWindow = window.open('', '', 'height=500,width=500');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window. Please check your popup settings.",
        variant: "destructive",
      });
      return;
    }
    
    printWindow.document.write('<html><head><title>Print QR Code</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
      .container { max-width: 400px; margin: 0 auto; }
      img { max-width: 100%; height: auto; }
      h2 { margin-top: 10px; margin-bottom: 5px; }
      p { margin-top: 5px; color: #666; }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="container">');
    printWindow.document.write(`<img src="${qrCodeRef.current.src}" alt="QR Code" />`);
    printWindow.document.write(`<h2>${device.brand} ${device.model}</h2>`);
    if (device.assetTag) {
      printWindow.document.write(`<p>Asset Tag: ${device.assetTag}</p>`);
    }
    printWindow.document.write(`<p>Code: ${qrCodeData.code}</p>`);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();
    
    // Print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    
    toast({
      title: "Success",
      description: "QR code sent to printer",
    });
  };

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      await apiRequest({
        method: 'DELETE',
        url: `/api/devices/${deviceId}`
      });
      return deviceId;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Device deleted successfully",
      });
      navigate('/devices');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete device",
        variant: "destructive",
      });
    }
  });

  // Handle device deletion
  const handleDelete = () => {
    if (id) {
      deleteDeviceMutation.mutate(id);
    }
  };

  // History table columns
  const historyColumns = [
    {
      header: "Date",
      accessor: (entry: any) => formatDate(entry.assignedAt),
    },
    {
      header: "Action",
      accessor: (entry: any) => entry.unassignedAt ? "Unassigned" : "Assigned",
      cell: (entry: any) => (
        <Badge 
          variant="outline" 
          className={
            entry.unassignedAt
              ? "bg-red-100 text-red-800 border-0"
              : "bg-green-100 text-green-800 border-0"
          }
        >
          {entry.unassignedAt ? "Unassigned" : "Assigned"}
        </Badge>
      ),
    },
    {
      header: "Assigned To",
      accessor: (entry: any) => entry.user?.name || "-",
      cell: (entry: any) => {
        if (!entry.user) return "-";
        
        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback>
                {entry.user.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span>{entry.user.name}</span>
          </div>
        );
      },
    },
    {
      header: "Assigned By",
      accessor: (entry: any) => entry.assignor?.name || "-",
    },
    {
      header: "End Date",
      accessor: (entry: any) => formatDate(entry.unassignedAt) || "-",
    },
  ];
  
  // Maintenance records table columns
  const maintenanceColumns = [
    {
      header: "Type",
      accessor: (record: any) => record.maintenanceType,
      cell: (record: any) => (
        <div className="flex items-center">
          {record.maintenanceType === 'repair' && (
            <Wrench className="h-4 w-4 mr-2 text-blue-500" />
          )}
          {record.maintenanceType === 'upgrade' && (
            <Wrench className="h-4 w-4 mr-2 text-green-500" />
          )}
          {record.maintenanceType === 'cleaning' && (
            <Wrench className="h-4 w-4 mr-2 text-yellow-500" />
          )}
          {record.maintenanceType === 'inspection' && (
            <Wrench className="h-4 w-4 mr-2 text-purple-500" />
          )}
          <span className="capitalize">{record.maintenanceType}</span>
        </div>
      ),
    },
    {
      header: "Description",
      accessor: (record: any) => record.description,
    },
    {
      header: "Status",
      accessor: (record: any) => record.status,
      cell: (record: any) => {
        const statusColors = {
          scheduled: { bg: "bg-blue-100", text: "text-blue-800", icon: <CalendarClock className="h-4 w-4 mr-1" /> },
          in_progress: { bg: "bg-yellow-100", text: "text-yellow-800", icon: <Clock className="h-4 w-4 mr-1" /> },
          completed: { bg: "bg-green-100", text: "text-green-800", icon: <CheckCircle className="h-4 w-4 mr-1" /> },
          cancelled: { bg: "bg-red-100", text: "text-red-800", icon: <AlertTriangle className="h-4 w-4 mr-1" /> },
        };
        
        const statusConfig = statusColors[record.status as keyof typeof statusColors] || statusColors.scheduled;
        
        return (
          <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.text} border-0 flex items-center`}>
            {statusConfig.icon}
            <span className="capitalize">{record.status.replace('_', ' ')}</span>
          </Badge>
        );
      },
    },
    {
      header: "Scheduled Date",
      accessor: (record: any) => record.scheduledDate ? formatDate(record.scheduledDate) : "Not scheduled",
    },
    {
      header: "Completed Date",
      accessor: (record: any) => record.completedDate ? formatDate(record.completedDate) : "Pending",
    },
    {
      header: "Cost",
      accessor: (record: any) => record.cost ? formatCurrency(record.cost) : "N/A",
    },
  ];

  const handleFormSubmitSuccess = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: [`/api/devices/${id}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    
    // Also refresh maintenance records and assignment history
    if (!isNewDevice) {
      refetchMaintenance();
      refetchHistory();
    }
    
    if (isNewDevice) {
      navigate('/devices');
      toast({
        title: "Success",
        description: "Device created successfully",
      });
    } else {
      toast({
        title: "Success",
        description: "Device updated successfully",
      });
    }
  };

  // Fetch assignment history separately to allow real-time updates
  const { data: assignmentHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: [`/api/devices/${id}/history`],
    enabled: !isNewDevice && !!id && !!device,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
  
  // Fetch maintenance records separately
  const { data: maintenanceRecords = [], refetch: refetchMaintenance } = useQuery({
    queryKey: [`/api/devices/${id}/maintenance`],
    enabled: !isNewDevice && !!id && !!device,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Set up auto-refresh of assignment history data
  useEffect(() => {
    // Function to refresh assignment history
    const refreshHistory = () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${id}/history`] });
    };

    // Set up a document visibility change listener to refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshHistory();
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id]);
  
  // Set up auto-refresh of maintenance records
  useEffect(() => {
    // Function to refresh maintenance records
    const refreshMaintenance = () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${id}/maintenance`] });
    };

    // Set up a document visibility change listener to refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshMaintenance();
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id]);

  const handleAssignmentComplete = () => {
    setShowAssignDialog(false);
    // Invalidate device data
    queryClient.invalidateQueries({ queryKey: [`/api/devices/${id}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    
    // Explicitly refetch the assignment history and maintenance records
    refetchHistory();
    refetchMaintenance();
    
    toast({
      title: "Success",
      description: "Device assignment updated successfully",
    });
  };

  // Check if warranty is expiring soon (within 30 days)
  const isWarrantyExpiringSoon = (warrantyDate: string | null) => {
    if (!warrantyDate) return false;
    const days = daysFromNow(warrantyDate);
    return days !== null && days > 0 && days <= 30;
  };

  // Check if warranty has expired
  const hasWarrantyExpired = (warrantyDate: string | null) => {
    if (!warrantyDate) return false;
    const days = daysFromNow(warrantyDate);
    return days !== null && days <= 0;
  };
  
  // Update comments mutation
  const updateCommentsMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log(`Attempting to update comments for device ID: ${id}`, {
          data: { notes: commentsValue }
        });
        
        const response = await apiRequest({
          method: 'PATCH',
          url: `/api/devices/${id}`,
          data: {
            notes: commentsValue
          }
        });
        
        console.log("Comments update response:", response);
        return response;
      } catch (error) {
        console.error("Error updating device comments:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsCommentsEditing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${id}`] });
      toast({
        title: "Success",
        description: "Device comments updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error in mutation handler:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update device comments",
        variant: "destructive",
      });
    }
  });

  // Handle comments update
  const handleCommentsUpdate = () => {
    updateCommentsMutation.mutate();
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mt-10 md:mt-0">
      {/* Header with back button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => navigate('/devices')}
        >
          <ChevronLeftIcon className="mr-2 h-4 w-4" />
          Back to Devices
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isNewDevice ? 'Add New Device' : isEditing ? 'Edit Device' : 'Device Details'}
        </h1>
      </div>

      {/* Device Form or Device Details */}
      {isEditing || isNewDevice ? (
        <Card>
          <CardHeader>
            <CardTitle>{isNewDevice ? 'Create Device' : 'Edit Device'}</CardTitle>
            <CardDescription>
              {isNewDevice 
                ? 'Enter details to create a new device' 
                : 'Update device information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeviceForm 
              device={!isNewDevice ? device : undefined} 
              onSuccess={handleFormSubmitSuccess}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {deviceLoading ? (
            <div className="flex items-center justify-center h-64">
              <p>Loading device details...</p>
            </div>
          ) : device ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Device Info Card */}
              <Card className="md:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle>Device Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                      <LaptopIcon className="h-12 w-12 text-primary-600" />
                    </div>
                    {device.name && (
                      <h2 className="text-xl font-semibold">{device.name}</h2>
                    )}
                    <h3 className="text-lg font-medium mt-1">{`${device.brand} ${device.model}`}</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {device.assetTag}
                      </Badge>
                      {device.category && (
                        <Badge variant="secondary" className="mr-2">
                          {device.category.name}
                        </Badge>
                      )}
                      {device.status && (
                        <Badge variant="outline" className={
                          device.status === 'active' ? "bg-green-100 text-green-800 border-0" :
                          device.status === 'broken' ? "bg-red-100 text-red-800 border-0" : 
                          device.status === 'lost' ? "bg-amber-100 text-amber-800 border-0" :
                          device.status === 'retired' ? "bg-gray-100 text-gray-800 border-0" :
                          device.status === 'in_repair' ? "bg-blue-100 text-blue-800 border-0" :
                          ""
                        }>
                          {device.status === 'active' ? 'Active' :
                           device.status === 'broken' ? 'Broken' :
                           device.status === 'lost' ? 'Lost' :
                           device.status === 'retired' ? 'Retired' :
                           device.status === 'in_repair' ? 'In Repair' :
                           device.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <TagIcon className="h-5 w-5 text-muted-foreground mr-2" />
                      <span className="text-sm font-medium text-foreground">Serial Number:</span>
                      <span className="text-sm text-muted-foreground ml-2">{device.serialNumber}</span>
                    </div>
                    
                    {device.purchaseCost && (
                      <div className="flex items-center">
                        <CreditCardIcon className="h-5 w-5 text-muted-foreground mr-2" />
                        <span className="text-sm font-medium text-foreground">Purchase Cost:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatCurrency(device.purchaseCost)}
                        </span>
                      </div>
                    )}
                    
                    {device.purchaseDate && (
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground mr-2" />
                        <span className="text-sm font-medium text-foreground">Purchase Date:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatDate(device.purchaseDate)}
                        </span>
                      </div>
                    )}
                    
                    {device.warrantyEOL && (
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground mr-2" />
                        <span className="text-sm font-medium text-foreground">Warranty Ends:</span>
                        <span 
                          className={`text-sm ml-2 ${
                            hasWarrantyExpired(device.warrantyEOL)
                              ? "text-red-600"
                              : isWarrantyExpiringSoon(device.warrantyEOL)
                              ? "text-yellow-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatDate(device.warrantyEOL)}
                          {hasWarrantyExpired(device.warrantyEOL) && " (Expired)"}
                          {isWarrantyExpiringSoon(device.warrantyEOL) && " (Expiring soon)"}
                        </span>
                      </div>
                    )}
                    
                    {device.purchasedBy && (
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-muted-foreground mr-2" />
                        <span className="text-sm font-medium text-foreground">Purchased By:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {device.purchasedBy}
                        </span>
                      </div>
                    )}
                    
                    {device.invoiceFileName && (
                      <div className="flex items-center mt-3">
                        {device.invoiceFileType?.includes('pdf') ? (
                          <FileTextIcon className="h-5 w-5 text-red-500 mr-2" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-blue-500 mr-2" />
                        )}
                        <span className="text-sm font-medium text-foreground">Invoice:</span>
                        <div className="flex items-center ml-2">
                          <span className="text-sm text-muted-foreground mr-2">
                            {device.invoiceFileName}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPdfViewerDialog(true)}
                            className="h-6 px-2 text-blue-600 hover:text-blue-800"
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = `/api/devices/${device.id}/invoice`;
                              a.download = device.invoiceFileName || 'invoice';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="h-6 px-2 text-blue-600 hover:text-blue-800"
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-medium text-foreground mb-2">Current Assignment</h3>
                    {device.user ? (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {device.user.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-foreground">{device.user.name}</p>
                            {device.user.department && (
                              <p className="text-xs text-muted-foreground">{device.user.department}</p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => setShowAssignDialog(true)}
                        >
                          <UserCheckIcon className="h-4 w-4 mr-2" />
                          Reassign
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <div className="flex items-center">
                          <InfoIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-2" />
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">This device is not assigned to any user</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => setShowAssignDialog(true)}
                        >
                          <UserCheckIcon className="h-4 w-4 mr-2" />
                          Assign Device
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Comments Section */}
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-foreground">
                        <div className="flex items-center">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mr-1" />
                          <span>Comments</span>
                        </div>
                      </h3>
                      {isCommentsEditing ? (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsCommentsEditing(false);
                              setCommentsValue(device.notes || "");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleCommentsUpdate}
                            disabled={updateCommentsMutation.isPending}
                          >
                            {updateCommentsMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCommentsEditing(true)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <Textarea 
                        placeholder="Add comments about this device..."
                        className="min-h-[100px] bg-background"
                        value={commentsValue}
                        onChange={(e) => setCommentsValue(e.target.value)}
                        disabled={!isCommentsEditing || updateCommentsMutation.isPending}
                      />
                      {!device.notes && !isCommentsEditing && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          No comments have been added for this device yet.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* QR Code Section */}
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-foreground">
                        <div className="flex items-center">
                          <QrCodeIcon className="h-4 w-4 text-muted-foreground mr-1" />
                          <span>Device QR Code</span>
                        </div>
                      </h3>
                      
                      {qrCodeLoading ? (
                        <div className="h-9 w-24 bg-gray-100 rounded-md animate-pulse"></div>
                      ) : qrCodeData ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowQrCodeDialog(true)}
                        >
                          <QrCodeIcon className="h-4 w-4 mr-1" />
                          View QR Code
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => createQrCodeMutation.mutate()}
                          disabled={createQrCodeMutation.isPending}
                        >
                          {createQrCodeMutation.isPending ? (
                            <>
                              <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <QrCodeIcon className="h-4 w-4 mr-1" />
                              Generate QR Code
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {/* Just a simple status indicator */}
                    {!qrCodeLoading && qrCodeData && (
                      <div className="text-sm text-muted-foreground">
                        <span className="inline-flex items-center">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          QR code available
                        </span>
                        <span className="text-xs block mt-1">
                          Last scanned: {qrCodeData.lastScanned ? formatDate(qrCodeData.lastScanned) : 'Never'}
                        </span>
                      </div>
                    )}
                    
                    {/* Hidden reference for QR code download/print */}
                    {qrCodeData && (
                      <div className="hidden" aria-hidden="true">
                        <img ref={qrCodeRef} src="" alt="QR Code for download" />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(true)}
                  >
                    <EditIcon className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteAlert(true)}
                  >
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>



              {/* Assignment History Card */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Assignment History</CardTitle>
                    <CardDescription>
                      History of all assignments for this device
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assignmentHistory.length > 0 ? (
                      <DataTable 
                        data={assignmentHistory}
                        columns={historyColumns}
                        keyField="id"
                        searchable={false}
                        onRowClick={(historyEntry) => {
                          // If we're already on the device page, no need to navigate
                          if (historyEntry.deviceId.toString() === id) return;
                          
                          // Navigate to the device's details page
                          navigate(`/devices/${historyEntry.deviceId}`);
                        }}
                        emptyState={
                          <div className="text-center py-6">
                            <InfoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <h3 className="text-sm font-medium text-foreground">No assignment history</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              This device hasn't been assigned to any users yet.
                            </p>
                          </div>
                        }
                      />
                    ) : (
                      <div className="text-center py-6">
                        <InfoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <h3 className="text-sm font-medium text-foreground">No assignment history</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          This device hasn't been assigned to any users yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Maintenance Records Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>
                      <div className="flex items-center">
                        <Wrench className="h-5 w-5 mr-2 text-primary" />
                        <span>Maintenance Records</span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      History of maintenance activities for this device
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {maintenanceRecords.length > 0 ? (
                      <DataTable 
                        data={maintenanceRecords}
                        columns={maintenanceColumns}
                        keyField="id"
                        searchable={false}
                        emptyState={
                          <div className="text-center py-6">
                            <InfoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <h3 className="text-sm font-medium text-foreground">No maintenance records</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              This device hasn't had any maintenance activities recorded yet.
                            </p>
                          </div>
                        }
                      />
                    ) : (
                      <div className="text-center py-6">
                        <InfoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <h3 className="text-sm font-medium text-foreground">No maintenance records</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          This device hasn't had any maintenance activities recorded yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-10">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-foreground">Device not found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">The device you're looking for doesn't exist or has been deleted.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/devices')}
                  >
                    Back to Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the device from the active inventory but preserve its history.
              The device will no longer appear in lists or reports but assignment history will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Device Assignment Dialog */}
      {device && showAssignDialog && (
        <DeviceAssignmentDialog
          device={device}
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          onAssignmentComplete={handleAssignmentComplete}
        />
      )}

      {/* QR Code Dialog */}
      {device && qrCodeData && (
        <Dialog open={showQrCodeDialog} onOpenChange={setShowQrCodeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Device QR Code</DialogTitle>
              <DialogDescription>
                Scan this code to view device details
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-4">
              <QrCodeDisplay 
                value={qrCodeData.code}
                label={device.assetTag || qrCodeData.code}
                size={200}
                includeLabel={true}
                id="device-qrcode"
              />
              <div className="mt-4 text-center">
                <p className="font-medium text-foreground">{`${device.brand} ${device.model}`}</p>
                <p className="text-sm text-muted-foreground">Asset Tag: {device.assetTag}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Last scanned: {qrCodeData.lastScanned ? formatDate(qrCodeData.lastScanned) : 'Never'}<br />
                  Scan count: {qrCodeData.scanCount || 0}
                </p>
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleQrCodeDownload}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleQrCodePrint}
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* PDF Viewer Dialog */}
      {device && device.invoiceFileName && (
        <PdfViewerDialog
          isOpen={showPdfViewerDialog}
          onClose={() => setShowPdfViewerDialog(false)}
          deviceId={parseInt(id)}
          fileName={device.invoiceFileName}
        />
      )}
    </div>
  );
}
