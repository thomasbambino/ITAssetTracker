import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserCheckIcon, UserXIcon } from 'lucide-react';

interface DeviceAssignmentDialogProps {
  device: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentComplete?: () => void;
}

export function DeviceAssignmentDialog({
  device,
  open,
  onOpenChange,
  onAssignmentComplete
}: DeviceAssignmentDialogProps) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const isAssigned = !!device.user;
  
  // Fetch users for the assignment dropdown
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });
  
  // Assign device mutation
  const assignDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, userId }: { deviceId: number, userId: number }) => {
      const response = await apiRequest({
        method: 'POST', 
        url: `/api/devices/${deviceId}/assign`, 
        data: { userId }
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate the device history query to update the history table
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${device.id}/history`] });
      
      toast({
        title: "Success",
        description: "Device assigned successfully",
      });
      if (onAssignmentComplete) onAssignmentComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign device",
        variant: "destructive",
      });
    }
  });
  
  // Unassign device mutation
  const unassignDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const response = await apiRequest({
        method: 'POST',
        url: `/api/devices/${deviceId}/unassign`,
        data: {}
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate the device history query to update the history table
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${device.id}/history`] });
      
      toast({
        title: "Success",
        description: "Device unassigned successfully",
      });
      if (onAssignmentComplete) onAssignmentComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign device",
        variant: "destructive",
      });
    }
  });
  
  const handleAssign = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }
    
    assignDeviceMutation.mutate({
      deviceId: device.id,
      userId: parseInt(selectedUserId),
    });
  };
  
  const handleUnassign = () => {
    unassignDeviceMutation.mutate(device.id);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAssigned ? 'Reassign Device' : 'Assign Device'}
          </DialogTitle>
          <DialogDescription>
            {isAssigned 
              ? `This device is currently assigned to ${device.user.name}. You can reassign it to another user or unassign it.` 
              : 'Assign this device to a user in your organization.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4">
            <div className="font-medium mb-1">Device Information:</div>
            <div className="text-sm text-gray-600">
              {device.brand} {device.model} ({device.assetTag})
            </div>
          </div>
          
          {isAssigned && (
            <div className="mb-4">
              <div className="font-medium mb-1">Currently Assigned To:</div>
              <div className="text-sm text-gray-600 flex items-center">
                <UserCheckIcon className="h-4 w-4 mr-1 text-green-600" />
                {device.user.name}
                {device.user.department && (
                  <span className="text-gray-500 ml-1">
                    ({device.user.department})
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="user-select">Assign to</Label>
            <CustomDropdown 
              options={users.map(user => ({
                id: user.id.toString(),
                label: `${user.firstName} ${user.lastName}`,
                sublabel: user.department || undefined
              }))}
              value={selectedUserId}
              onChange={setSelectedUserId}
              placeholder="Select a user"
              disabled={usersLoading}
              searchPlaceholder="Search users..."
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          {isAssigned && (
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleUnassign}
              disabled={unassignDeviceMutation.isPending}
            >
              <UserXIcon className="h-4 w-4 mr-2" />
              {unassignDeviceMutation.isPending ? 'Unassigning...' : 'Unassign'}
            </Button>
          )}
          <div className={isAssigned ? '' : 'ml-auto'}>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={!selectedUserId || assignDeviceMutation.isPending}
            >
              <UserCheckIcon className="h-4 w-4 mr-2" />
              {assignDeviceMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}