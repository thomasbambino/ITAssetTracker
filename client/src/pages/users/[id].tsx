import { useState, useEffect, useCallback } from 'react';
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
  UserIcon, 
  PhoneIcon, 
  MailIcon, 
  BuildingIcon,
  EditIcon,
  Trash2Icon,
  LaptopIcon,
  PackageIcon,
  KeyIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  UserPlusIcon,
  UserXIcon,
  UserCheckIcon,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DataTable } from '@/components/ui/data-table';
import { formatPhoneNumber, cn } from '@/lib/utils';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { UserForm } from '@/components/forms/UserForm';
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown';

export default function UserDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    tempPassword?: string;
    emailSent?: boolean;
    emailError?: string;
  } | null>(null);
  
  // Device action states
  const [deviceToUnassign, setDeviceToUnassign] = useState<number | null>(null);
  const [deviceToTransfer, setDeviceToTransfer] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // State for device action dialogs
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);

  // Determine if we're in "new user" mode
  const isNewUser = id === 'new';
  
  // Fetch user details and devices assigned to user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: [`/api/users/${id}`],
    enabled: !isNewUser && !!id,
  });
  
  // Fetch software assignments for this user
  const { data: softwareAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: [`/api/software-assignments/user/${id}`],
    enabled: !isNewUser && !!id,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest({
        method: 'DELETE', 
        url: `/api/users/${userId}`
      });
      return userId;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      navigate('/users');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    }
  });

  // Handle user deletion
  const handleDelete = () => {
    if (id) {
      deleteUserMutation.mutate(id);
    }
  };
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      try {
        return await apiRequest({
          method: 'POST', 
          url: `/api/auth/reset-password/${userId}`
        });
      } catch (error) {
        console.error('Password reset error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to reset password');
      }
    },
    onSuccess: (data) => {
      setResetPasswordResult({
        tempPassword: data.tempPassword,
        emailSent: data.emailSent,
        emailError: data.emailError
      });
      setShowResetPasswordDialog(false);
      toast({
        title: "Success",
        description: "Password has been reset",
      });
    },
    onError: (error) => {
      setShowResetPasswordDialog(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    }
  });
  
  // Handle password reset
  const handleResetPassword = () => {
    if (id) {
      setShowResetPasswordDialog(true);
    }
  };
  
  // Handle reset password confirmation
  const confirmResetPassword = () => {
    if (id) {
      resetPasswordMutation.mutate(id);
    }
  };

  // Unassign device mutation
  const unassignDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      await apiRequest({
        method: 'POST',
        url: `/api/devices/${deviceId}/unassign`
      });
      return deviceId;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Device has been unassigned successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
      setShowUnassignDialog(false);
      setDeviceToUnassign(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign device",
        variant: "destructive",
      });
      setShowUnassignDialog(false);
    }
  });

  // Transfer device mutation
  const transferDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, userId }: { deviceId: number, userId: string }) => {
      await apiRequest({
        method: 'POST',
        url: `/api/devices/${deviceId}/assign`,
        data: { userId: parseInt(userId) }
      });
      return { deviceId, userId };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Device has been transferred successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
      setShowTransferDialog(false);
      setDeviceToTransfer(null);
      setSelectedUserId('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transfer device",
        variant: "destructive",
      });
      setShowTransferDialog(false);
    }
  });
  
  // Fetch all users for transfer dialog
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: showTransferDialog,
  });

  // Handle device unassignment
  const handleUnassignDevice = () => {
    if (deviceToUnassign) {
      unassignDeviceMutation.mutate(deviceToUnassign);
    }
  };

  // Handle device transfer
  const handleTransferDevice = () => {
    if (deviceToTransfer && selectedUserId) {
      transferDeviceMutation.mutate({ 
        deviceId: deviceToTransfer.id, 
        userId: selectedUserId 
      });
    }
  };

  // Device actions for the table
  const deviceActions = [
    {
      label: "Edit",
      icon: <EditIcon className="h-4 w-4" />,
      onClick: (device: any) => {
        navigate(`/devices/${device.id}`);
      },
    },
    {
      label: "Transfer",
      icon: <UserCheckIcon className="h-4 w-4" />,
      onClick: (device: any) => {
        setDeviceToTransfer(device);
        setShowTransferDialog(true);
      },
    },
    {
      label: "Unassign",
      icon: <UserXIcon className="h-4 w-4" />,
      onClick: (device: any) => {
        setDeviceToUnassign(device.id);
        setShowUnassignDialog(true);
      },
    },
  ];

  // Table columns for devices
  const deviceColumns = [
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
      accessor: (device: any) => device.category?.name || '-',
    },
    {
      header: "Serial Number",
      accessor: "serialNumber",
    },
    {
      header: "Asset Tag",
      accessor: "assetTag",
    },
  ];
  
  // Table columns for software assignments
  const softwareColumns = [
    {
      header: "Software",
      accessor: (assignment: any) => assignment.software?.name || assignment.softwareName || 'Unknown Software',
    },
    {
      header: "Vendor",
      accessor: (assignment: any) => assignment.software?.vendor || '-',
    },
    {
      header: "License Type",
      accessor: (assignment: any) => assignment.software?.licenseType || '-',
    },
    {
      header: "Assignment Date",
      accessor: (assignment: any) => assignment.assignedAt ? 
        new Date(assignment.assignedAt).toLocaleDateString() : '-',
    },
    {
      header: "Expiry Date",
      accessor: (assignment: any) => {
        if (assignment.expiryDate) {
          return new Date(assignment.expiryDate).toLocaleDateString();
        } else if (assignment.software?.expiryDate) {
          return new Date(assignment.software.expiryDate).toLocaleDateString();
        } else {
          return 'No expiry';
        }
      },
    },
  ];

  const handleFormSubmitSuccess = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    
    if (isNewUser) {
      navigate('/users');
      toast({
        title: "Success",
        description: "User created successfully",
      });
    } else {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mt-10 md:mt-0">
      {/* Header with back button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => navigate('/users')}
        >
          <ChevronLeftIcon className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isNewUser ? 'Add New User' : isEditing ? 'Edit User' : 'User Details'}
        </h1>
      </div>

      {/* User Form or User Details */}
      {isEditing || isNewUser ? (
        <Card>
          <CardHeader>
            <CardTitle>{isNewUser ? 'Create User' : 'Edit User'}</CardTitle>
            <CardDescription>
              {isNewUser 
                ? 'Enter details to create a new user' 
                : 'Update user information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserForm 
              user={!isNewUser ? user : undefined} 
              onSuccess={handleFormSubmitSuccess}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {userLoading ? (
            <div className="flex items-center justify-center h-64">
              <p>Loading user details...</p>
            </div>
          ) : user ? (
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Info Card */}
                <Card className="md:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle>User Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                        <UserIcon className="h-12 w-12 text-primary-600" />
                      </div>
                      <h2 className="text-xl font-semibold">{`${user.firstName} ${user.lastName}`}</h2>
                      <div className="flex items-center mt-1 space-x-2">
                        {user.department && (
                          <Badge variant="outline">
                            {user.department}
                          </Badge>
                        )}
                        <Badge variant={user.role === 'admin' ? 'secondary' : 'outline'}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center">
                        <MailIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">{user.email}</span>
                      </div>
                      
                      {user.phoneNumber && (
                        <div className="flex items-center">
                          <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700">
                            {formatPhoneNumber(user.phoneNumber)}
                          </span>
                        </div>
                      )}
                      
                      {user.department && (
                        <div className="flex items-center">
                          <BuildingIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700">{user.department}</span>
                        </div>
                      )}
                      
                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={handleResetPassword}
                          disabled={resetPasswordMutation.isPending}
                        >
                          <KeyIcon className="h-4 w-4 mr-2" />
                          {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                        </Button>
                      </div>
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
                
                {/* Software Assignments Card */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>Assigned Software</CardTitle>
                      <Link href="/software">
                        <Button variant="outline" size="sm">
                          <PackageIcon className="h-4 w-4 mr-2" />
                          Manage Software
                        </Button>
                      </Link>
                    </div>
                    <CardDescription>
                      Software licenses assigned to this user
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assignmentsLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <p>Loading software assignments...</p>
                      </div>
                    ) : softwareAssignments && softwareAssignments.length > 0 ? (
                      <DataTable 
                        data={softwareAssignments}
                        columns={softwareColumns}
                        keyField="id"
                        onRowClick={(assignment) => navigate(`/software/${assignment.software?.id || assignment.softwareId}`)}
                        emptyState={
                          <div className="text-center py-6">
                            <PackageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <h3 className="text-sm font-medium text-gray-900">No software assigned</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              This user doesn't have any software licenses assigned yet.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-3"
                              onClick={() => navigate('/software')}
                            >
                              Assign Software
                            </Button>
                          </div>
                        }
                      />
                    ) : (
                      <div className="text-center py-6">
                        <PackageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <h3 className="text-sm font-medium text-gray-900">No software assigned</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          This user doesn't have any software licenses assigned yet.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => navigate('/software')}
                        >
                          Assign Software
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Assigned Devices Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Assigned Devices</CardTitle>
                    <Link href="/devices">
                      <Button variant="outline" size="sm">
                        <LaptopIcon className="h-4 w-4 mr-2" />
                        Manage Devices
                      </Button>
                    </Link>
                  </div>
                  <CardDescription>
                    Devices currently assigned to this user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.devices && user.devices.length > 0 ? (
                    <DataTable 
                      data={user.devices}
                      columns={deviceColumns}
                      keyField="id"
                      onRowClick={(device) => navigate(`/devices/${device.id}`)}
                      actions={deviceActions}
                      emptyState={
                        <div className="text-center py-6">
                          <LaptopIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <h3 className="text-sm font-medium text-gray-900">No devices assigned</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            This user doesn't have any devices assigned yet.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => navigate('/devices')}
                          >
                            Assign Device
                          </Button>
                        </div>
                      }
                    />
                  ) : (
                    <div className="text-center py-6">
                      <LaptopIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <h3 className="text-sm font-medium text-gray-900">No devices assigned</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        This user doesn't have any devices assigned yet.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => navigate('/devices')}
                      >
                        Assign Device
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-10">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">User not found</h3>
                  <p className="mt-1 text-sm text-gray-500">The user you're looking for doesn't exist or has been deleted.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/users')}
                  >
                    Back to Users
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
              This action cannot be undone. This will permanently delete the user
              and remove their data from our servers.
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

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset User Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a temporary password for the user. If email settings are configured,
              an email with the temporary password will be sent to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmResetPassword}
              className="bg-primary"
            >
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Result Dialog */}
      <Dialog open={!!resetPasswordResult} onOpenChange={() => setResetPasswordResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Complete</DialogTitle>
            <DialogDescription>
              A temporary password has been generated for the user.
              {resetPasswordResult?.emailSent && " An email has also been sent to the user with this information."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Always show the temporary password prominently */}
          {resetPasswordResult?.tempPassword && (
            <div className="py-4">
              <label className="block text-sm font-medium mb-2">Temporary Password:</label>
              <div className="bg-muted p-4 rounded-md font-mono text-lg text-center font-bold border">
                {resetPasswordResult.tempPassword}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Please provide this temporary password to the user. They will be prompted to change it on first login.
              </p>
            </div>
          )}
          
          {/* Show email status: success or failure */}
          {resetPasswordResult?.emailSent && (
            <div className="py-2 flex items-center space-x-2 text-green-600">
              <CheckCircleIcon className="h-5 w-5" />
              <span>Email sent successfully</span>
            </div>
          )}
          
          {resetPasswordResult?.emailError && (
            <div className="py-2">
              <div className="flex items-center space-x-2 text-red-600 mb-2">
                <AlertCircleIcon className="h-5 w-5" />
                <span>Failed to send email</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Error: {resetPasswordResult.emailError}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setResetPasswordResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Unassign Device Confirmation Dialog */}
      <AlertDialog open={showUnassignDialog} onOpenChange={setShowUnassignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unassign this device from the user? 
              The device will be marked as unassigned and available for assignment to other users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDeviceToUnassign(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnassignDevice}
              className="bg-primary"
              disabled={unassignDeviceMutation.isPending}
            >
              {unassignDeviceMutation.isPending ? 'Unassigning...' : 'Unassign Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Transfer Device Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={(open) => {
        setShowTransferDialog(open);
        if (!open) {
          setDeviceToTransfer(null);
          setSelectedUserId('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Device</DialogTitle>
            <DialogDescription>
              Transfer this device to another user. Select the user you want to transfer the device to.
            </DialogDescription>
          </DialogHeader>
          
          {deviceToTransfer && (
            <div className="py-2">
              <h3 className="text-sm font-medium mb-1">Device Information:</h3>
              <div className="bg-muted p-3 rounded-md mb-4">
                <p className="font-medium">{deviceToTransfer.brand} {deviceToTransfer.model}</p>
                <p className="text-sm text-muted-foreground">Serial: {deviceToTransfer.serialNumber}</p>
                <p className="text-sm text-muted-foreground">Asset Tag: {deviceToTransfer.assetTag}</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Select User:</Label>
                  <CustomDropdown 
                    options={allUsers
                      .filter((u: any) => u.id.toString() !== id) // Filter out current user
                      .map((user: any) => ({
                        id: user.id.toString(),
                        label: `${user.firstName} ${user.lastName}`,
                        sublabel: user.email || user.department || undefined
                      }))
                    }
                    value={selectedUserId}
                    onChange={(value) => setSelectedUserId(value.toString())}
                    placeholder="Select a user"
                    searchPlaceholder="Search users..."
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTransferDialog(false);
              setDeviceToTransfer(null);
              setSelectedUserId('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransferDevice}
              disabled={!selectedUserId || transferDeviceMutation.isPending}
            >
              {transferDeviceMutation.isPending ? 'Transferring...' : 'Transfer Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
