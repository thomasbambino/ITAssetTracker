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
import { generateAssetTag } from "@/lib/utils";
import { insertDeviceSchema } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

// Create a schema for device creation/update
const formSchema = insertDeviceSchema.extend({
  // Make sure serial number and assetTag are required with clear error messages
  serialNumber: z.string().min(1, "Serial number is required"),
  assetTag: z.string().min(1, "Asset tag is required"),
  categoryId: z.coerce.number().nullable(),
  purchaseDate: z.date().nullable().optional(),
  warrantyEOL: z.date().nullable().optional(),
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

  // Initialize form with default values
  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brand: device?.brand || "",
      model: device?.model || "",
      serialNumber: device?.serialNumber || "",
      assetTag: device?.assetTag || generateAssetTag(),
      categoryId: device?.categoryId?.toString() || "",
      purchaseCost: device?.purchaseCost ? device.purchaseCost : null,
      purchaseDate: device?.purchaseDate ? new Date(device.purchaseDate) : null,
      purchasedBy: device?.purchasedBy || "",
      warrantyEOL: device?.warrantyEOL ? new Date(device.warrantyEOL) : null,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: DeviceFormValues) => {
      const response = await apiRequest("POST", "/api/devices", data);
      return response.json();
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
      const response = await apiRequest("PUT", `/api/devices/${device.id}`, data);
      return response.json();
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
  const onSubmit = (data: DeviceFormValues) => {
    // Convert cost to cents and handle dates
    const formattedData = {
      ...data,
      purchaseCost: data.purchaseCost ? parseInt(data.purchaseCost.toString()) : null,
      categoryId: data.categoryId ? parseInt(data.categoryId.toString()) : null,
      // Ensure dates are properly parsed to ISO strings
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      warrantyEOL: data.warrantyEOL ? new Date(data.warrantyEOL) : null,
    };

    // Show form data for debugging
    console.log("Submitting device data:", formattedData);

    if (isUpdateMode) {
      updateMutation.mutate(formattedData);
    } else {
      createMutation.mutate(formattedData);
    }
  };

  // Generate a new asset tag
  const handleGenerateAssetTag = () => {
    form.setValue("assetTag", generateAssetTag());
  };
  
  // Generate a random serial number
  const handleGenerateSerialNumber = () => {
    const randomSerial = `SN-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    form.setValue("serialNumber", randomSerial);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="text-sm text-gray-500 pb-2 border-b border-gray-200">
          Fields marked with <span className="text-red-500">*</span> are required
        </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Serial Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSerialNumber}
                    className="h-6 text-xs"
                  >
                    Generate
                  </Button>
                </div>
                <FormControl>
                  <Input placeholder="Serial Number" {...field} required />
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
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Asset Tag <span className="text-red-500">*</span>
                  </FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAssetTag}
                    className="h-6 text-xs"
                  >
                    Generate
                  </Button>
                </div>
                <FormControl>
                  <Input placeholder="Asset Tag" {...field} required />
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
                    <SelectItem value="loading" disabled>
                      Loading categories...
                    </SelectItem>
                  ) : categories && categories.length > 0 ? (
                    categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
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
          name="purchaseCost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Cost</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="0.00" 
                  {...field} 
                  onChange={(e) => {
                    // Allow empty value or valid numbers with decimals
                    const value = e.target.value;
                    if (value === "" || value === null) {
                      field.onChange(null);
                    } else {
                      // Remove any non-numeric characters except decimal point
                      const numericValue = value.replace(/[^0-9.]/g, '');
                      // Convert to cents for storage
                      const centsValue = Math.round(parseFloat(numericValue) * 100);
                      if (!isNaN(centsValue)) {
                        field.onChange(centsValue);
                      }
                    }
                  }}
                  value={field.value ? (field.value / 100).toFixed(2) : ""}
                />
              </FormControl>
              <FormDescription>
                Enter the cost in dollars (e.g., 1299.99)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
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
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purchaser" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {usersLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading users...
                    </SelectItem>
                  ) : users && users.length > 0 ? (
                    users.map((user: any) => (
                      <SelectItem key={user.id} value={`${user.firstName} ${user.lastName}`}>
                        {`${user.firstName} ${user.lastName}`} {user.department ? `(${user.department})` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
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
