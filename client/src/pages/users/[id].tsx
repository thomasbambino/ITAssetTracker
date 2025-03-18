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
  UserIcon, 
  PhoneIcon, 
  MailIcon, 
  BuildingIcon,
  EditIcon,
  Trash2Icon,
  LaptopIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DataTable } from '@/components/ui/data-table';
import { formatPhoneNumber } from '@/lib/utils';
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
import { UserForm } from '@/components/forms/UserForm';

export default function UserDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Determine if we're in "new user" mode
  const isNewUser = id === 'new';
  
  // Fetch user details and devices assigned to user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: [`/api/users/${id}`],
    enabled: !isNewUser && !!id,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/users/${userId}`);
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

  // Table columns for devices
  const deviceColumns = [
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
      accessor: (device: any) => device.category?.name || '-',
    },
    {
      header: "Serial Number",
      accessor: "serialNumber",
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
                    {user.department && (
                      <Badge variant="outline" className="mt-1">
                        {user.department}
                      </Badge>
                    )}
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

              {/* Assigned Devices Card */}
              <Card className="md:col-span-2">
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
    </div>
  );
}
