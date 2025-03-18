import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useParams, Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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
  InfoIcon
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
import { DeviceAssignmentDialog } from '@/components/devices/DeviceAssignmentDialog';
import { DeviceForm } from '@/components/forms/DeviceForm';
import { DataTable } from '@/components/ui/data-table';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function DeviceDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Determine if we're in "new device" mode
  const isNewDevice = id === 'new';
  
  // Fetch device details
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${id}`],
    enabled: !isNewDevice && !!id,
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      await apiRequest('DELETE', `/api/devices/${deviceId}`);
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
      accessor: (entry: any) => entry.assignedTo?.name || "-",
      cell: (entry: any) => {
        if (!entry.assignedTo) return "-";
        
        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback>
                {entry.assignedTo.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span>{entry.assignedTo.name}</span>
          </div>
        );
      },
    },
    {
      header: "Assigned By",
      accessor: (entry: any) => entry.assignedBy?.name || "-",
    },
    {
      header: "End Date",
      accessor: (entry: any) => formatDate(entry.unassignedAt) || "-",
    },
  ];

  const handleFormSubmitSuccess = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: [`/api/devices/${id}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    
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

  const handleAssignmentComplete = () => {
    setShowAssignDialog(false);
    queryClient.invalidateQueries({ queryKey: [`/api/devices/${id}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
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
        <h1 className="text-2xl font-semibold text-gray-900">
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
                    <h2 className="text-xl font-semibold">{`${device.brand} ${device.model}`}</h2>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {device.assetTag}
                      </Badge>
                      {device.category && (
                        <Badge variant="secondary">
                          {device.category.name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Serial Number:</span>
                      <span className="text-sm text-gray-600 ml-2">{device.serialNumber}</span>
                    </div>
                    
                    {device.purchaseCost && (
                      <div className="flex items-center">
                        <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Purchase Cost:</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {formatCurrency(device.purchaseCost)}
                        </span>
                      </div>
                    )}
                    
                    {device.purchaseDate && (
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Purchase Date:</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {formatDate(device.purchaseDate)}
                        </span>
                      </div>
                    )}
                    
                    {device.warrantyEOL && (
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Warranty Ends:</span>
                        <span 
                          className={`text-sm ml-2 ${
                            hasWarrantyExpired(device.warrantyEOL)
                              ? "text-red-600"
                              : isWarrantyExpiringSoon(device.warrantyEOL)
                              ? "text-yellow-600"
                              : "text-gray-600"
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
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Purchased By:</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {device.purchasedBy}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Current Assignment</h3>
                    {device.user ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {device.user.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{device.user.name}</p>
                            {device.user.department && (
                              <p className="text-xs text-gray-500">{device.user.department}</p>
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
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <InfoIcon className="h-5 w-5 text-yellow-500 mr-2" />
                          <p className="text-sm text-yellow-700">This device is not assigned to any user</p>
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
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle>Assignment History</CardTitle>
                  <CardDescription>
                    History of all assignments for this device
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {device.history && device.history.length > 0 ? (
                    <DataTable 
                      data={device.history}
                      columns={historyColumns}
                      keyField="id"
                      searchable={false}
                      emptyState={
                        <div className="text-center py-6">
                          <InfoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <h3 className="text-sm font-medium text-gray-900">No assignment history</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            This device hasn't been assigned to any users yet.
                          </p>
                        </div>
                      }
                    />
                  ) : (
                    <div className="text-center py-6">
                      <InfoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <h3 className="text-sm font-medium text-gray-900">No assignment history</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        This device hasn't been assigned to any users yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-10">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Device not found</h3>
                  <p className="mt-1 text-sm text-gray-500">The device you're looking for doesn't exist or has been deleted.</p>
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
              This action cannot be undone. This will permanently delete the device
              and its assignment history from our servers.
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
    </div>
  );
}
