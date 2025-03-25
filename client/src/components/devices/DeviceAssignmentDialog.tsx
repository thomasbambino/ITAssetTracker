import { useState, useRef } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, UserCheckIcon, UserXIcon, SearchIcon } from 'lucide-react';

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
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isAssigned = !!device.user;
  
  // Fetch users for the assignment dropdown
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });
  
  // Sort users alphabetically by firstName + lastName
  const sortedUsers = [...users].sort((a, b) => {
    const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
    const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
    return aName.localeCompare(bName);
  });
  
  // Filter users based on search query
  const filteredUsers = sortedUsers.filter(user => {
    if (!searchQuery) return true;
    
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const department = user.department ? user.department.toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || department.includes(query);
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
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="user-select"
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  aria-label="Select a user"
                  className="justify-between w-full"
                  disabled={usersLoading}
                >
                  {selectedUserId ? (
                    sortedUsers.find(user => user.id.toString() === selectedUserId) ? (
                      `${sortedUsers.find(user => user.id.toString() === selectedUserId)?.firstName} ${sortedUsers.find(user => user.id.toString() === selectedUserId)?.lastName}`
                    ) : "Select a user"
                  ) : (
                    "Select a user"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[300px]">
                <Command>
                  <CommandInput 
                    placeholder="Search users..."
                    onValueChange={setSearchQuery}
                  />
                  <CommandEmpty>
                    {usersLoading ? "Loading..." : "No users found"}
                  </CommandEmpty>
                  <div className="max-h-[200px] overflow-y-auto">
                    <CommandGroup>
                    {filteredUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={`${user.firstName} ${user.lastName} ${user.department || ''}`}
                        onSelect={() => {
                          setSelectedUserId(user.id.toString());
                          setPopoverOpen(false);
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <span className="text-sm">{user.firstName} {user.lastName}</span>
                          {user.department && (
                            <span className="ml-2 text-xs text-gray-500">({user.department})</span>
                          )}
                        </div>
                        {selectedUserId === user.id.toString() && <Check className="h-4 w-4" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  </div>
                </Command>
              </PopoverContent>
            </Popover>
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
