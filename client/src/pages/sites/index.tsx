import { useState } from 'react';

interface Site {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
}
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '../../components/icons';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Define schema for site creation/update
const siteSchema = z.object({
  name: z.string().min(1, { message: 'Site name is required' }),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

type SiteFormValues = z.infer<typeof siteSchema>;

export default function Sites() {
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [isEditSiteOpen, setIsEditSiteOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const { data: sites = [], isLoading, isError } = useQuery<Site[]>({
    queryKey: ['/api/sites'],
    retry: 1,
  });

  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      notes: '',
    },
  });

  const editForm = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      notes: '',
    },
  });

  const createSiteMutation = useMutation({
    mutationFn: (values: SiteFormValues) => {
      return apiRequest({
        url: '/api/sites', 
        method: 'POST',
        data: values
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site created successfully' });
      setIsAddSiteOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/sites'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create site', variant: 'destructive' });
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: (values: SiteFormValues & { id: number }) => {
      return apiRequest({
        url: `/api/sites/${values.id}`,
        method: 'PATCH',
        data: values
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site updated successfully' });
      setIsEditSiteOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/sites'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update site', variant: 'destructive' });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest({
        url: `/api/sites/${id}`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/sites'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message === 'Cannot delete site that has devices assigned' 
          ? 'Cannot delete site that has devices assigned to it'
          : 'Failed to delete site', 
        variant: 'destructive' 
      });
    },
  });

  const onSubmit = (values: SiteFormValues) => {
    createSiteMutation.mutate(values);
  };

  const onEdit = (values: SiteFormValues) => {
    if (!selectedSite) return;
    updateSiteMutation.mutate({ ...values, id: selectedSite.id });
  };

  const handleEditClick = (site: Site) => {
    setSelectedSite(site);
    editForm.reset({
      name: site.name || '',
      address: site.address || '',
      city: site.city || '',
      state: site.state || '',
      zipCode: site.zipCode || '',
      country: site.country || '',
      notes: site.notes || '',
    });
    setIsEditSiteOpen(true);
  };

  const handleDeleteClick = (siteId: number) => {
    if (confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      deleteSiteMutation.mutate(siteId);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sites</h1>
        <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              Add Site
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Site</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Headquarters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP/Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional information about this site"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createSiteMutation.isPending}>
                    {createSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-500">Failed to load sites</p>
          </CardContent>
        </Card>
      ) : sites?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No sites found. Add your first site using the button above.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Dialog open={isEditSiteOpen} onOpenChange={setIsEditSiteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Site</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP/Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={updateSiteMutation.isPending}>
                      {updateSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites?.map((site: Site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.address || '-'}</TableCell>
                      <TableCell>{site.city || '-'}</TableCell>
                      <TableCell>{site.state || '-'}</TableCell>
                      <TableCell>{site.country || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(site)}
                          className="h-8 px-2"
                        >
                          <Icons.edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(site.id)}
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
        </>
      )}
    </div>
  );
}