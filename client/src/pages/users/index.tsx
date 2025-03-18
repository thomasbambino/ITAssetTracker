import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon, FileInput, FileOutput, Trash2Icon, EditIcon } from 'lucide-react';
import { ActionButton } from '@/components/dashboard/ActionButton';
import { useCsvImport, useCsvExport } from '@/hooks/use-csv';
import { CsvImport } from '@/components/ui/csv-import';
import { User } from '@shared/schema';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

export default function Users() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  
  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Export CSV
  const { exportCsv, isExporting } = useCsvExport('/api/export/users');
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/users/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    }
  });
  
  // Table columns
  const columns = [
    {
      header: "Name",
      accessor: (user: User) => `${user.firstName} ${user.lastName}`,
    },
    {
      header: "Email",
      accessor: "email",
    },
    {
      header: "Phone",
      accessor: "phoneNumber",
    },
    {
      header: "Department",
      accessor: "department",
    },
  ];
  
  // Table actions
  const actions = [
    {
      label: "Edit",
      icon: <EditIcon className="h-4 w-4" />,
      onClick: (user: User) => {
        navigate(`/users/${user.id}`);
      },
    },
    {
      label: "Delete",
      icon: <Trash2Icon className="h-4 w-4" />,
      onClick: (user: User) => {
        setUserToDelete(user.id);
      },
    },
  ];
  
  // Handle CSV import success
  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    toast({
      title: "Success",
      description: "Users imported successfully",
    });
  };
  
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mt-10 md:mt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-600">Manage users in your organization</p>
        </div>
        
        {/* Actions */}
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <ActionButton
            icon={<PlusIcon className="h-4 w-4" />}
            label="Add User"
            onClick={() => navigate('/users/new')}
          />
          <CsvImport 
            url="/api/import/users"
            entityName="Users"
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
      
      {/* Users Table */}
      <DataTable
        data={users || []}
        columns={columns}
        keyField="id"
        loading={isLoading}
        onRowClick={(user) => navigate(`/users/${user.id}`)}
        actions={actions}
        emptyState={
          <div className="text-center py-10">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No users</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/users/new')}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        }
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
