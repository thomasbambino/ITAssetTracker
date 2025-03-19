import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { 
  PlusIcon, 
  UserCheckIcon, 
  Trash2Icon, 
  EditIcon, 
  FileOutput 
} from 'lucide-react';
import { ActionButton } from '@/components/dashboard/ActionButton';
import { CsvImport } from '@/components/ui/csv-import';
import { useCsvExport } from '@/hooks/use-csv';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DeviceAssignmentDialog } from '@/components/devices/DeviceAssignmentDialog';
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
import { Button } from '@/components/ui/button';

export default function Devices() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deviceToDelete, setDeviceToDelete] = useState<number | null>(null);
  const [assignmentDialogDevice, setAssignmentDialogDevice] = useState<any | null>(null);
  
  // Fetch devices
  const { data: devices, isLoading } = useQuery({
    queryKey: ['/api/devices'],
  });
  
  // Export CSV
  const { exportCsv, isExporting } = useCsvExport('/api/export/devices');
  
  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/devices/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Device deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      setDeviceToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete device",
        variant: "destructive",
      });
    }
  });
  
  // Table columns
  const columns = [
    {
      header: "Asset Tag",
      accessor: "assetTag",
    },
    {
      header: "Brand",
      accessor: "brand",
    },
    {
      header: "Model",
      accessor: "model",
    },
    {
      header: "Category",
      accessor: (device: any) => (
        <Badge variant="outline" className="font-normal">
          {device.category?.name || 'Uncategorized'}
        </Badge>
      ),
    },
    {
      header: "Assigned To",
      accessor: (device: any) => {
        if (!device.user) return 'Unassigned';
        return device.user.name;
      },
      cell: (device: any) => {
        if (!device.user) {
          return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-0">Unassigned</Badge>;
        }
        return (
          <div className="flex items-center space-x-1">
            <span>{device.user.name}</span>
            {device.user.department && (
              <Badge variant="outline" className="font-normal text-xs">
                {device.user.department}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: "Purchase Date",
      accessor: (device: any) => formatDate(device.purchaseDate),
    },
    {
      header: "Purchase Cost",
      accessor: (device: any) => formatCurrency(device.purchaseCost),
    },
  ];
  
  // Table actions
  const actions = [
    {
      label: "Assign",
      icon: <UserCheckIcon className="h-4 w-4" />,
      onClick: (device: any) => {
        setAssignmentDialogDevice(device);
      },
    },
    {
      label: "Edit",
      icon: <EditIcon className="h-4 w-4" />,
      onClick: (device: any) => {
        navigate(`/devices/${device.id}`);
      },
    },
    {
      label: "Delete",
      icon: <Trash2Icon className="h-4 w-4" />,
      onClick: (device: any) => {
        setDeviceToDelete(device.id);
      },
    },
  ];
  
  // Handle CSV import success
  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    toast({
      title: "Success",
      description: "Devices imported successfully",
    });
  };
  
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mt-10 md:mt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Devices</h1>
          <p className="mt-1 text-sm text-gray-600">Manage hardware assets in your organization</p>
        </div>
        
        {/* Actions */}
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <ActionButton
            icon={<PlusIcon className="h-4 w-4" />}
            label="Add Device"
            onClick={() => navigate('/devices/new')}
          />
          <CsvImport 
            url="/api/import/devices"
            entityName="Devices"
            onSuccess={handleImportSuccess}
          />
          <ActionButton
            icon={<FileOutput className="h-4 w-4" />}
            label="Export CSV"
            onClick={exportCsv}
            variant="secondary"
            disabled={isExporting}
          />
        </div>
      </div>
      
      {/* Devices Table */}
      <DataTable
        data={devices || []}
        columns={columns}
        keyField="id"
        loading={isLoading}
        onRowClick={(device) => navigate(`/devices/${device.id}`)}
        actions={actions}
        emptyState={
          <div className="text-center py-10">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No devices</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new device.</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/devices/new')}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>
        }
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deviceToDelete} onOpenChange={(open) => !open && setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the device from the active inventory but preserve its history.
              The device will no longer appear in lists or reports but assignment history will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deviceToDelete && deleteDeviceMutation.mutate(deviceToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Device Assignment Dialog */}
      {assignmentDialogDevice && (
        <DeviceAssignmentDialog
          device={assignmentDialogDevice}
          open={!!assignmentDialogDevice}
          onOpenChange={(open) => !open && setAssignmentDialogDevice(null)}
          onAssignmentComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
            setAssignmentDialogDevice(null);
          }}
        />
      )}
    </div>
  );
}
