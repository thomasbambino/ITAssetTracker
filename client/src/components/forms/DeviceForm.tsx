import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertDeviceSchema } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  CalendarIcon, 
  UploadIcon, 
  FileIcon, 
  PaperclipIcon, 
  FileTextIcon, 
  ImageIcon,
  XIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Create a schema for device creation/update
const formSchema = insertDeviceSchema.extend({
  // Device name field
  name: z.string().optional(),
  // Make serial number and assetTag optional
  serialNumber: z.string().optional().nullable(),
  assetTag: z.string().optional().nullable(),
  categoryId: z.coerce.number().nullable(),
  // Add site selection
  siteId: z.coerce.number().nullable(),
  // Add address field
  address: z.string().optional().nullable(),
  status: z.string().default('active'),
  purchaseDate: z.date().nullable().optional(),
  warrantyEOL: z.date().nullable().optional(),
  // File upload fields - we'll handle file data separately
  invoiceFile: z.any().optional(),
  invoiceFileName: z.string().optional(),
  invoiceFileType: z.string().optional(),
});

type DeviceFormValues = z.infer<typeof formSchema>;

interface DeviceFormProps {
  device?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DeviceForm({ device, onSuccess, onCancel }: DeviceFormProps) {
  const { toast } = useToast();
  const isUpdateMode = !!device;

  // Fetch categories for dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Fetch users for "Purchased By" dropdown
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });
  
  // Fetch sites for site selection dropdown
  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ['/api/sites'],
  });

  // State for file upload
  const [filePreview, setFilePreview] = useState<{
    name: string;
    type: string;
    url?: string;
  } | null>(device?.invoiceFileName ? {
    name: device.invoiceFileName,
    type: device.invoiceFileType,
    url: device.invoiceFileUrl
  } : null);
  
  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with default values
  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: device?.name || "",
      brand: device?.brand || "",
      model: device?.model || "",
      serialNumber: device?.serialNumber || "",
      assetTag: device?.assetTag || "",
      categoryId: device?.categoryId?.toString() || "",
      siteId: device?.siteId?.toString() || "",
      address: device?.address || "",
      status: device?.status || "active",
      purchaseCost: device?.purchaseCost ? Number(device.purchaseCost) : null,
      purchaseDate: device?.purchaseDate ? new Date(device.purchaseDate) : null,
      purchasedBy: device?.purchasedBy || "",
      warrantyEOL: device?.warrantyEOL ? new Date(device.warrantyEOL) : null,
      invoiceFileName: device?.invoiceFileName || "",
      invoiceFileType: device?.invoiceFileType || "",
      specs: device?.specs || "",
    },
  });

  // Get the selected category to check if specs are enabled
  const selectedCategoryId = form.watch("categoryId");
  const selectedCategory = Array.isArray(categories) 
    ? categories.find((cat: any) => cat.id.toString() === selectedCategoryId)
    : null;
  const hasSpecsEnabled = selectedCategory?.hasSpecs === true;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: DeviceFormValues) => {
      const response = await apiRequest({
        url: "/api/devices",
        method: "POST",
        data: data
      });
      return response;
    },
    onSuccess: () => {
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create device",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: DeviceFormValues) => {
      const response = await apiRequest({
        url: `/api/devices/${device.id}`,
        method: "PUT",
        data: data
      });
      return response;
    },
    onSuccess: () => {
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update device",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (data: DeviceFormValues) => {
    // Create FormData for file upload
    const formData = new FormData();
    
    // Handle data formatting for submission
    const formattedData = {
      ...data,
      // Simply pass the purchase cost value - our Zod schema will handle conversion
      purchaseCost: data.purchaseCost,
      categoryId: data.categoryId ? parseInt(data.categoryId.toString()) : null,
      siteId: data.siteId ? parseInt(data.siteId.toString()) : null,
      // Ensure dates are properly parsed to ISO strings
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      warrantyEOL: data.warrantyEOL ? new Date(data.warrantyEOL) : null,
    };
    
    // Remove the file from the data as it will be sent separately
    const { invoiceFile, ...deviceData } = formattedData;
    
    // Add all device data fields to FormData
    Object.entries(deviceData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    
    // Add the file if provided
    if (invoiceFile && invoiceFile instanceof File) {
      formData.append('invoiceFile', invoiceFile);
    }

    // Show form data for debugging
    console.log("Submitting device data:", deviceData);
    console.log("Purchase cost value type:", typeof deviceData.purchaseCost, "Value:", deviceData.purchaseCost);

    try {
      if (isUpdateMode) {
        const response = await fetch(`/api/devices/${device.id}`, {
          method: 'PUT',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update device: ${response.statusText}`);
        }
        
        const result = await response.json();
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        if (onSuccess) onSuccess();
        
        toast({
          title: "Success",
          description: "Device updated successfully",
        });
      } else {
        const response = await fetch('/api/devices', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create device: ${response.statusText}`);
        }
        
        const result = await response.json();
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        if (onSuccess) onSuccess();
        
        toast({
          title: "Success",
          description: "Device created successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save device",
        variant: "destructive",
      });
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, JPEG, or PNG file",
          variant: "destructive"
        });
        return;
      }
      
      // Store file in form
      form.setValue("invoiceFile", file);
      form.setValue("invoiceFileName", file.name);
      form.setValue("invoiceFileType", file.type);
      
      // Create preview URL
      setFilePreview({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file)
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Device Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter a descriptive name for this device" value={field.value || ""} onChange={field.onChange} />
              </FormControl>
              <FormDescription className="text-xs">
                A descriptive name to easily identify this device
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Dell, HP, Lenovo, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="XPS 13, ThinkPad X1, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Device Specifications Section */}
        {hasSpecsEnabled && (
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium">Device Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specs"
                render={({ field }) => {
                  // Parse existing specs or initialize empty object
                  let specs = {};
                  try {
                    specs = field.value ? JSON.parse(field.value) : {};
                  } catch (e) {
                    specs = {};
                  }

                  const updateSpecs = (key: string, value: string) => {
                    const updatedSpecs = { ...specs, [key]: value };
                    field.onChange(JSON.stringify(updatedSpecs));
                  };

                  return (
                    <>
                      <div>
                        <label className="text-sm font-medium">CPU</label>
                        <Input 
                          placeholder="e.g., Intel Core i7-12700K"
                          value={(specs as any).cpu || ""}
                          onChange={(e) => updateSpecs('cpu', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">RAM</label>
                        <Input 
                          placeholder="e.g., 16GB DDR4"
                          value={(specs as any).ram || ""}
                          onChange={(e) => updateSpecs('ram', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Storage</label>
                        <Input 
                          placeholder="e.g., 512GB SSD"
                          value={(specs as any).storage || ""}
                          onChange={(e) => updateSpecs('storage', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Graphics</label>
                        <Input 
                          placeholder="e.g., NVIDIA RTX 4070"
                          value={(specs as any).graphics || ""}
                          onChange={(e) => updateSpecs('graphics', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Operating System</label>
                        <Input 
                          placeholder="e.g., Windows 11 Pro"
                          value={(specs as any).os || ""}
                          onChange={(e) => updateSpecs('os', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Display</label>
                        <Input 
                          placeholder="e.g., 27-inch 4K IPS"
                          value={(specs as any).display || ""}
                          onChange={(e) => updateSpecs('display', e.target.value)}
                        />
                      </div>
                    </>
                  );
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Serial Number
                </FormLabel>
                <FormControl>
                  <Input placeholder="Serial Number (optional)" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
                <FormDescription className="text-xs">
                  A unique identifier for this device
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assetTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Asset Tag
                </FormLabel>
                <FormControl>
                  <Input placeholder="Asset Tag (optional)" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
                <FormDescription className="text-xs">
                  A unique tracking identifier for the device
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value?.toString()}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoriesLoading ? (
                    <SelectItem value="loading_categories" disabled>
                      Loading categories...
                    </SelectItem>
                  ) : categories && Array.isArray(categories) && categories.length > 0 ? (
                    categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_categories" disabled>
                      No categories available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the type of device
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="siteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value?.toString()}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sitesLoading ? (
                    <SelectItem value="loading_sites" disabled>
                      Loading sites...
                    </SelectItem>
                  ) : sites && Array.isArray(sites) && sites.length > 0 ? (
                    sites.map((site: any) => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        {site.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_sites" disabled>
                      No sites available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the site/location for this device
              </FormDescription>
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
                <Input 
                  placeholder="123 Main Street, City, State ZIP" 
                  {...field} 
                  value={field.value || ""} 
                />
              </FormControl>
              <FormDescription>
                Physical street address where this device is located
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="broken">Broken</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="in_repair">In Repair</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Current status of the device
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purchaseCost"
          render={({ field }) => {
            // Use local state to track input value as text
            const [inputValue, setInputValue] = useState<string>(
              field.value !== null && field.value !== undefined
                ? (field.value / 100).toFixed(2)
                : ""
            );
            
            // When the form is first loaded, set the input value
            useEffect(() => {
              if (field.value !== null && field.value !== undefined) {
                setInputValue((field.value / 100).toFixed(2));
              }
            }, []);
            
            return (
              <FormItem>
                <FormLabel>Purchase Cost</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="0.00" 
                    onChange={(e) => {
                      // Store raw input value
                      const value = e.target.value;
                      
                      // Allow only numbers and a single decimal point
                      const regex = /^[0-9]*\.?[0-9]*$/;
                      if (value === "" || regex.test(value)) {
                        setInputValue(value);
                        
                        // Convert to cents for form data only when value is valid
                        if (value === "") {
                          field.onChange(null);
                        } else {
                          const parsedValue = parseFloat(value);
                          if (!isNaN(parsedValue)) {
                            const centsValue = Math.round(parsedValue * 100);
                            field.onChange(centsValue);
                          }
                        }
                      }
                    }}
                    // Display the raw input text, not the converted value
                    value={inputValue}
                    onBlur={() => {
                      // Format on blur for better display
                      if (inputValue !== "" && !isNaN(parseFloat(inputValue))) {
                        setInputValue(parseFloat(inputValue).toFixed(2));
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Enter the cost in dollars (e.g., 1299.99)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Purchase Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-gray-400" : ""}`}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="warrantyEOL"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Warranty End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-gray-400" : ""}`}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purchasedBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchased By</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value?.toString() || ""}
                value={field.value?.toString() || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purchaser" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {usersLoading ? (
                    <SelectItem value="loading_users" disabled>
                      Loading users...
                    </SelectItem>
                  ) : users && Array.isArray(users) && users.length > 0 ? (
                    users.map((user: any) => (
                      <SelectItem key={user.id} value={`${user.firstName} ${user.lastName}`}>
                        {`${user.firstName} ${user.lastName}`} {user.department ? `(${user.department})` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_users" disabled>
                      No users available
                    </SelectItem>
                  )}
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="it">IT Department</SelectItem>
                  <SelectItem value="finance">Finance Department</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Select who purchased this device
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="invoiceFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice / Receipt</FormLabel>
              <FormControl>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      className="hidden"
                      id="invoice-file-upload"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={fileInputRef}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        document.getElementById('invoice-file-upload')?.click();
                      }}
                      className="flex items-center"
                    >
                      <PaperclipIcon className="h-4 w-4 mr-2" />
                      Upload Invoice
                    </Button>
                    {form.watch("invoiceFileName") && (
                      <span className="text-sm text-muted-foreground">
                        {form.watch("invoiceFileName")}
                      </span>
                    )}
                  </div>
                  {(device?.invoiceFileName || filePreview) && (
                    <div className="mt-2 border border-gray-200 rounded-md p-3 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 text-sm">
                          {(device?.invoiceFileType || filePreview?.type)?.includes('pdf') ? (
                            <FileTextIcon className="h-4 w-4 text-red-500" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="font-medium">
                            {filePreview?.name || device?.invoiceFileName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {filePreview?.url || device?.invoiceFileUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const url = filePreview?.url || device?.invoiceFileUrl;
                                if (url) {
                                  window.open(url, '_blank');
                                }
                              }}
                              className="h-8 px-2"
                            >
                              View
                            </Button>
                          ) : null}
                          
                          {device?.invoiceFileUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (device?.invoiceFileUrl) {
                                  const a = document.createElement('a');
                                  a.href = device.invoiceFileUrl;
                                  a.download = device.invoiceFileName || 'invoice';
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }
                              }}
                              className="h-8 px-2"
                            >
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload an invoice or receipt for this device (PDF, JPEG, or PNG)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit"
            className="bg-primary hover:bg-primary/90"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : isUpdateMode
              ? "Update Device"
              : "Create Device"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
