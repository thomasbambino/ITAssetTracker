import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Loader2, Download, Cloud } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<CloudAsset | null>(null);
  const [filterResourceType, setFilterResourceType] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');

  // Fetch cloud assets
  const { data: cloudAssets = [], isLoading, isError } = useQuery<CloudAsset[]>({
    queryKey: ['/api/cloud-assets'],
    retry: 1,
  });

  // Fetch sites for dropdown
  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['/api/sites'],
    retry: 1,
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

  const createMutation = useMutation({
    mutationFn: (values: CloudAssetFormValues) => {
      return apiRequest({
        url: '/api/cloud-assets',
        method: 'POST',
        data: {
          ...values,
          siteId: values.siteId ? parseInt(values.siteId) : null,
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

  const updateMutation = useMutation({
    mutationFn: (values: CloudAssetFormValues & { id: number }) => {
      return apiRequest({
        url: `/api/cloud-assets/${values.id}`,
        method: 'PATCH',
        data: {
          ...values,
          siteId: values.siteId ? parseInt(values.siteId) : null,
        }
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Cloud asset updated successfully' });
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/cloud-assets'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update cloud asset', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest({
        url: `/api/cloud-assets/${id}`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Cloud asset deleted successfully' });
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
    if (!selectedAsset) return;
    updateMutation.mutate({ ...values, id: selectedAsset.id });
  };

  const handleEditClick = (asset: CloudAsset) => {
    setSelectedAsset(asset);
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
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (assetId: number) => {
    if (confirm('Are you sure you want to delete this cloud asset? This action cannot be undone.')) {
      deleteMutation.mutate(assetId);
    }
  };

  const handleExportCloudAssets = () => {
    window.location.href = '/api/export/cloud-assets';
  };

  const handleExportAllAssets = () => {
    window.location.href = '/api/export/assets';
  };

  // Filter cloud assets
  const filteredAssets = cloudAssets.filter(asset => {
    if (filterResourceType !== 'all' && asset.resourceType !== filterResourceType) {
      return false;
    }
    if (filterSite !== 'all') {
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

  const getStatusBadgeVariant = (status: string | null) => {
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">No site assigned</SelectItem>
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
            <Select onValueChange={field.onChange} value={field.value}>
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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Cloud className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Cloud Assets</h1>
        </div>
        <div className="flex gap-2">
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Icons.plus className="mr-2 h-4 w-4" />
                Add Cloud Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Cloud Asset</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {renderFormFields(form)}
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="w-48">
          <Select value={filterResourceType} onValueChange={setFilterResourceType}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueResourceTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={filterSite} onValueChange={setFilterSite}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {sites.map(site => (
                <SelectItem key={site.id} value={String(site.id)}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-500">Failed to load cloud assets</p>
          </CardContent>
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {cloudAssets.length === 0
                ? 'No cloud assets found. Add your first cloud asset using the button above.'
                : 'No cloud assets match the selected filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Cloud Asset</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
                  {renderFormFields(editForm)}
                  <DialogFooter>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subscription ID</TableHead>
                    <TableHead>Resource Group</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.resourceName}</TableCell>
                      <TableCell>{asset.resourceType}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {asset.subscriptionId ? (
                          <span title={asset.subscriptionId}>
                            {asset.subscriptionId.length > 16
                              ? `${asset.subscriptionId.slice(0, 8)}...${asset.subscriptionId.slice(-4)}`
                              : asset.subscriptionId}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{asset.resourceGroup || '-'}</TableCell>
                      <TableCell>{asset.region || '-'}</TableCell>
                      <TableCell>{asset.siteName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(asset.status)}>
                          {asset.status || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(asset)}
                          className="h-8 px-2"
                        >
                          <Icons.edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(asset.id)}
                          className="h-8 px-2"
                        >
                          <Icons.trash className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredAssets.length} of {cloudAssets.length} cloud assets
          </div>
        </>
      )}
    </div>
  );
}
