import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon, Trash2Icon, EditIcon, Download, CloudIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Cloud asset interface
interface CloudAsset {
  id: number;
  resourceName: string;
  resourceType: string;
  subscriptionId: string | null;
  resourceGroup: string | null;
  region: string | null;
  siteId: number | null;
  siteName: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string | null;
}

interface Site {
  id: number;
  name: string;
}

// Resource types for dropdown
const RESOURCE_TYPES = [
  { value: 'VM', label: 'VM (Virtual Machine)' },
  { value: 'App Service', label: 'App Service' },
  { value: 'Storage Account', label: 'Storage Account' },
  { value: 'Database', label: 'Database' },
  { value: 'Container', label: 'Container' },
  { value: 'Function App', label: 'Function App' },
  { value: 'Network', label: 'Network' },
  { value: 'Other', label: 'Other' },
];

// Status options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

// Define schema for cloud asset creation/update
const cloudAssetSchema = z.object({
  resourceName: z.string().min(1, { message: 'Resource name is required' }),
  resourceType: z.string().min(1, { message: 'Resource type is required' }),
  subscriptionId: z.string().optional(),
  resourceGroup: z.string().optional(),
  region: z.string().optional(),
  siteId: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

type CloudAssetFormValues = z.infer<typeof cloudAssetSchema>;

export default function CloudAssets() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CloudAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<number | null>(null);
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterSite, setFilterSite] = useState<string>('');

  // Fetch cloud assets
  const { data: cloudAssets = [], isLoading } = useQuery<CloudAsset[]>({
    queryKey: ['/api/cloud-assets'],
  });

  // Fetch sites for dropdown
  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['/api/sites'],
  });

  const form = useForm<CloudAssetFormValues>({
    resolver: zodResolver(cloudAssetSchema),
    defaultValues: {
      resourceName: '',
      resourceType: '',
      subscriptionId: '',
      resourceGroup: '',
      region: '',
      siteId: '',
      status: 'active',
      notes: '',
    },
  });

  const editForm = useForm<CloudAssetFormValues>({
    resolver: zodResolver(cloudAssetSchema),
    defaultValues: {
      resourceName: '',
      resourceType: '',
      subscriptionId: '',
      resourceGroup: '',
      region: '',
      siteId: '',
      status: 'active',
      notes: '',
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (values: CloudAssetFormValues) => {
      return apiRequest({
        url: '/api/cloud-assets',
        method: 'POST',
        data: {
          ...values,
          siteId: values.siteId && values.siteId !== 'none' ? parseInt(values.siteId) : null,
        }
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Cloud asset created successfully' });
      setIsAddDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/cloud-assets'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create cloud asset', variant: 'destructive' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (values: CloudAssetFormValues & { id: number }) => {
      return apiRequest({
        url: `/api/cloud-assets/${values.id}`,
        method: 'PATCH',
        data: {
          ...values,
          siteId: values.siteId && values.siteId !== 'none' ? parseInt(values.siteId) : null,
        }
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Cloud asset updated successfully' });
      setEditingAsset(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/cloud-assets'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update cloud asset', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest({
        url: `/api/cloud-assets/${id}`,
        method: 'DELETE'
      });
      return id;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Cloud asset deleted successfully' });
      setAssetToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/cloud-assets'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete cloud asset', variant: 'destructive' });
    },
  });

  const onSubmit = (values: CloudAssetFormValues) => {
    createMutation.mutate(values);
  };

  const onEdit = (values: CloudAssetFormValues) => {
    if (!editingAsset) return;
    updateMutation.mutate({ ...values, id: editingAsset.id });
  };

  const handleEditClick = (asset: CloudAsset) => {
    editForm.reset({
      resourceName: asset.resourceName || '',
      resourceType: asset.resourceType || '',
      subscriptionId: asset.subscriptionId || '',
      resourceGroup: asset.resourceGroup || '',
      region: asset.region || '',
      siteId: asset.siteId ? String(asset.siteId) : '',
      status: asset.status || 'active',
      notes: asset.notes || '',
    });
    setEditingAsset(asset);
  };

  const handleExportCloudAssets = () => {
    window.location.href = '/api/export/cloud-assets';
  };

  const handleExportAllAssets = () => {
    window.location.href = '/api/export/assets';
  };

  // Filter cloud assets
  const filteredAssets = cloudAssets.filter(asset => {
    if (filterResourceType && asset.resourceType !== filterResourceType) {
      return false;
    }
    if (filterSite) {
      if (filterSite === 'unassigned' && asset.siteId !== null) {
        return false;
      }
      if (filterSite !== 'unassigned' && asset.siteId !== parseInt(filterSite)) {
        return false;
      }
    }
    return true;
  });

  // Get unique resource types from data for filter dropdown
  const uniqueResourceTypes = Array.from(new Set(cloudAssets.map(a => a.resourceType))).filter(Boolean);

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'decommissioned':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Table columns
  const columns = [
    {
      header: "Resource Name",
      accessor: "resourceName",
      cell: (asset: CloudAsset) => (
        <div className="font-medium">{asset.resourceName}</div>
      ),
    },
    {
      header: "Type",
      accessor: "resourceType",
      cell: (asset: CloudAsset) => (
        <Badge variant="outline">{asset.resourceType}</Badge>
      ),
    },
    {
      header: "Subscription ID",
      accessor: "subscriptionId",
      cell: (asset: CloudAsset) => (
        <span className="font-mono text-xs" title={asset.subscriptionId || ''}>
          {asset.subscriptionId
            ? asset.subscriptionId.length > 16
              ? `${asset.subscriptionId.slice(0, 8)}...${asset.subscriptionId.slice(-4)}`
              : asset.subscriptionId
            : '-'}
        </span>
      ),
    },
    {
      header: "Resource Group",
      accessor: "resourceGroup",
      cell: (asset: CloudAsset) => asset.resourceGroup || '-',
    },
    {
      header: "Region",
      accessor: "region",
      cell: (asset: CloudAsset) => asset.region || '-',
    },
    {
      header: "Site",
      accessor: "siteName",
      cell: (asset: CloudAsset) => asset.siteName || '-',
    },
    {
      header: "Status",
      accessor: "status",
      cell: (asset: CloudAsset) => (
        <Badge variant={getStatusBadgeVariant(asset.status)}>
          {asset.status || 'unknown'}
        </Badge>
      ),
    },
  ];

  // Table actions
  const actions = [
    {
      label: "Edit",
      icon: <EditIcon className="h-4 w-4" />,
      onClick: (asset: CloudAsset) => handleEditClick(asset),
    },
    {
      label: "Delete",
      icon: <Trash2Icon className="h-4 w-4" />,
      onClick: (asset: CloudAsset) => setAssetToDelete(asset.id),
    },
  ];

  // Form fields component (used for both create and edit dialogs)
  const renderFormFields = (formInstance: typeof form | typeof editForm) => (
    <>
      <FormField
        control={formInstance.control}
        name="resourceName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Resource Name*</FormLabel>
            <FormControl>
              <Input placeholder="my-web-app" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={formInstance.control}
        name="resourceType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Resource Type*</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select resource type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {RESOURCE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={formInstance.control}
          name="subscriptionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription ID</FormLabel>
              <FormControl>
                <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="resourceGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resource Group</FormLabel>
              <FormControl>
                <Input placeholder="rg-production" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={formInstance.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Region</FormLabel>
              <FormControl>
                <Input placeholder="East US" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="siteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No site assigned</SelectItem>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={String(site.id)}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={formInstance.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || "active"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={formInstance.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Additional information about this cloud resource"
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mt-10 md:mt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cloud Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage Azure and cloud resources</p>
        </div>

        {/* Actions */}
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCloudAssets}>
                Export Cloud Assets Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAllAssets}>
                Export All Assets (Devices + Cloud)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ActionButton
            icon={<PlusIcon className="h-4 w-4" />}
            label="Add Cloud Asset"
            onClick={() => setIsAddDialogOpen(true)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <Select value={filterResourceType || "all_types"} onValueChange={(v) => setFilterResourceType(v === "all_types" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_types">All Types</SelectItem>
            {uniqueResourceTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSite || "all_sites"} onValueChange={(v) => setFilterSite(v === "all_sites" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_sites">All Sites</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {sites.map(site => (
              <SelectItem key={site.id} value={String(site.id)}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cloud Assets Table */}
      <DataTable
        data={filteredAssets}
        columns={columns}
        keyField="id"
        loading={isLoading}
        actions={actions}
        emptyState={
          <div className="text-center py-10">
            <CloudIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No cloud assets</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {cloudAssets.length === 0
                ? 'Get started by adding a new cloud asset.'
                : 'No cloud assets match the selected filters.'}
            </p>
            {cloudAssets.length === 0 && (
              <div className="mt-6">
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Cloud Asset
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the cloud asset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assetToDelete && deleteMutation.mutate(assetToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Cloud Asset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Cloud Asset</DialogTitle>
            <DialogDescription>
              Create a new cloud resource entry
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {renderFormFields(form)}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Cloud Asset Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Cloud Asset</DialogTitle>
            <DialogDescription>
              Update the cloud resource details
            </DialogDescription>
          </DialogHeader>
          {editingAsset && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
                {renderFormFields(editForm)}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingAsset(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
