import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon, Trash2Icon, EditIcon, LaptopIcon } from 'lucide-react';
import { ActionButton } from '@/components/dashboard/ActionButton';
import { Badge } from '@/components/ui/badge';
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
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { CategoryForm } from '@/components/forms/CategoryForm';

export default function Categories() {
  const { toast } = useToast();
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/categories/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to delete category. It might be in use by devices.",
        variant: "destructive",
      });
    }
  });
  
  // Table columns
  const columns = [
    {
      header: "Name",
      accessor: "name",
      cell: (category: any) => (
        <div className="font-medium">{category.name}</div>
      ),
    },
    {
      header: "Description",
      accessor: "description",
      cell: (category: any) => (
        <div className="text-gray-600">{category.description || '-'}</div>
      ),
    },
    {
      header: "Devices",
      accessor: (category: any) => category.devices?.length || 0,
      cell: (category: any) => {
        const count = category.devices?.length || 0;
        return count > 0 ? (
          <Badge variant="secondary">
            <LaptopIcon className="h-3.5 w-3.5 mr-1" />
            {count} {count === 1 ? 'device' : 'devices'}
          </Badge>
        ) : (
          <span className="text-gray-500">No devices</span>
        );
      },
    },
  ];
  
  // Table actions
  const actions = [
    {
      label: "Edit",
      icon: <EditIcon className="h-4 w-4" />,
      onClick: (category: any) => {
        setEditingCategory(category);
      },
    },
    {
      label: "Delete",
      icon: <Trash2Icon className="h-4 w-4" />,
      onClick: (category: any) => {
        setCategoryToDelete(category.id);
      },
    },
  ];
  
  const handleCategoryFormSuccess = () => {
    setIsAddDialogOpen(false);
    setEditingCategory(null);
    queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    toast({
      title: "Success",
      description: editingCategory 
        ? "Category updated successfully" 
        : "Category created successfully",
    });
  };
  
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mt-10 md:mt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-600">Manage device categories</p>
        </div>
        
        {/* Actions */}
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <ActionButton
            icon={<PlusIcon className="h-4 w-4" />}
            label="Add Category"
            onClick={() => setIsAddDialogOpen(true)}
          />
        </div>
      </div>
      
      {/* Categories Table */}
      <DataTable
        data={categories || []}
        columns={columns}
        keyField="id"
        loading={isLoading}
        actions={actions}
        emptyState={
          <div className="text-center py-10">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No categories</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new category.</p>
            <div className="mt-6">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        }
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category.
              Note that you cannot delete categories that have devices assigned to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => categoryToDelete && deleteCategoryMutation.mutate(categoryToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for organizing devices
            </DialogDescription>
          </DialogHeader>
          <CategoryForm onSuccess={handleCategoryFormSuccess} />
        </DialogContent>
      </Dialog>
      
      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm 
              category={editingCategory} 
              onSuccess={handleCategoryFormSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
