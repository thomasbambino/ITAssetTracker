import { useState, useEffect } from 'react';
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
  FileOutput,
  FilterIcon,
  XIcon
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function Devices() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deviceToDelete, setDeviceToDelete] = useState<number | null>(null);
  const [assignmentDialogDevice, setAssignmentDialogDevice] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  
  // Extract query parameters from URL
  const [location] = useLocation();
  
  // Parse URL params on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const departmentParam = params.get('department');
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    
    if (departmentParam) {
      setSelectedDepartment(departmentParam);
    }
  }, [location]);
  
  // Fetch devices
  const { data: devicesData = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/devices'],
  });
  
  // Sort devices alphabetically by brand and model
  const devices = [...devicesData].sort((a, b) => {
    const deviceA = `${a.brand} ${a.model}`.toLowerCase();
    const deviceB = `${b.brand} ${b.model}`.toLowerCase();
    return deviceA.localeCompare(deviceB);
  });
  
  // Fetch categories for the filter
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });
  
  // Extract unique departments from devices for filtering
  const departmentsList = devices
    .filter(device => device.user && device.user.department)
    .map(device => device.user.department)
    .filter((department, index, self) => self.indexOf(department) === index)
    .sort();
  
  // Export CSV
  const { exportCsv, isExporting } = useCsvExport('/api/export/devices');
  
  // Handle filter changes
  const handleCategoryChange = (value: string) => {
    // Convert "all_categories" to empty string for filter logic
    const filterValue = value === "all_categories" ? "" : value;
    setSelectedCategory(filterValue);
    
    // Update URL with the new filter
    const params = new URLSearchParams(window.location.search);
    if (filterValue) {
      params.set('category', filterValue);
    } else {
      params.delete('category');
    }
    
    // Keep department filter if it exists
    if (selectedDepartment) {
      params.set('department', selectedDepartment);
    }
    
    // Update URL without refreshing the page
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.pushState({}, '', newUrl);
  };
  
  const handleDepartmentChange = (value: string) => {
    // Convert "all_departments" to empty string for filter logic
    const filterValue = value === "all_departments" ? "" : value;
    setSelectedDepartment(filterValue);
    
    // Update URL with the new filter
    const params = new URLSearchParams(window.location.search);
    if (filterValue) {
      params.set('department', filterValue);
    } else {
      params.delete('department');
    }
    
    // Keep category filter if it exists
    if (selectedCategory) {
      params.set('category', selectedCategory);
    }
    
    // Update URL without refreshing the page
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.pushState({}, '', newUrl);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedDepartment('');
    
    // Remove filter params from URL
    window.history.pushState({}, '', window.location.pathname);
  };
  
  // Filter devices based on selected category and department
  const filteredDevices = devices.filter((device: any) => {
    let matchesCategory = true;
    let matchesDepartment = true;
    
    if (selectedCategory) {
      matchesCategory = device.category && device.category.id.toString() === selectedCategory;
    }
    
    if (selectedDepartment) {
      matchesDepartment = device.user && device.user.department === selectedDepartment;
    }
    
    return matchesCategory && matchesDepartment;
  });
  
  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest({
        method: 'DELETE',
        url: `/api/devices/${id}`
      });
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
      header: "Brand",
      accessor: "brand",
    },
    {
      header: "Model",
      accessor: "model",
    },
    {
      header: "Device Name",
      accessor: "name",
    },
    {
      header: "Asset Tag",
      accessor: "assetTag",
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
          <h1 className="text-2xl font-semibold text-foreground">Devices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage hardware assets in your organization</p>
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
      
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex flex-col space-y-1 flex-grow">
              <label htmlFor="category-filter" className="text-sm font-medium">Filter by Category</label>
              <Select
                value={selectedCategory}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger id="category-filter" className="w-full md:w-[220px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_categories">All Categories</SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1 flex-grow">
              <label htmlFor="department-filter" className="text-sm font-medium">Filter by Department</label>
              <Select
                value={selectedDepartment}
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger id="department-filter" className="w-full md:w-[220px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_departments">All Departments</SelectItem>
                  {departmentsList.map((department: string) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(selectedCategory || selectedDepartment) && (
              <div className="flex items-end md:self-end">
                <Button
                  variant="ghost"
                  className="h-10 px-3 text-xs"
                  onClick={clearFilters}
                >
                  <XIcon className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
          
          {/* Active Filters Summary */}
          {(selectedCategory || selectedDepartment) && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              {selectedCategory && categories.find((c: any) => c.id.toString() === selectedCategory) && (
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-1 pl-3 pr-2 py-1.5 h-7 bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  <FilterIcon className="h-3 w-3 mr-1 text-blue-600" />
                  Category: {categories.find((c: any) => c.id.toString() === selectedCategory)?.name}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-4 w-4 p-0 ml-1 rounded-full hover:bg-blue-200" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryChange('all_categories');
                    }}
                  >
                    <XIcon className="h-3 w-3 text-blue-700" />
                  </Button>
                </Badge>
              )}
              
              {selectedDepartment && (
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-1 pl-3 pr-2 py-1.5 h-7 bg-purple-50 text-purple-700 hover:bg-purple-100"
                >
                  <FilterIcon className="h-3 w-3 mr-1 text-purple-600" />
                  Department: {selectedDepartment}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-4 w-4 p-0 ml-1 rounded-full hover:bg-purple-200" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDepartmentChange('all_departments');
                    }}
                  >
                    <XIcon className="h-3 w-3 text-purple-700" />
                  </Button>
                </Badge>
              )}
              
              {filteredDevices.length > 0 && (
                <div className="text-sm text-muted-foreground ml-auto">
                  Showing {filteredDevices.length} of {devices.length} devices
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Devices Table */}
      <DataTable
        data={filteredDevices}
        columns={columns}
        keyField="id"
        loading={isLoading}
        onRowClick={(device) => navigate(`/devices/${device.id}`)}
        actions={actions}
        emptyState={
          <div className="text-center py-10">
            {selectedCategory || selectedDepartment ? (
              <>
                <h3 className="mt-2 text-sm font-semibold text-foreground">No matching devices</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or clearing them.</p>
                <div className="mt-6">
                  <Button onClick={clearFilters} variant="outline">
                    <XIcon className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No devices</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new device.</p>
                <div className="mt-6">
                  <Button onClick={() => navigate('/devices/new')}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Device
                  </Button>
                </div>
              </>
            )}
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
