import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Define the form schema
const formSchema = z.object({
  deviceId: z.number({
    required_error: "Please select a device",
    invalid_type_error: "Please select a valid device"
  }).min(1, "Device selection is required"),
  description: z.string().min(2, "Description must be at least 2 characters"),
  maintenanceType: z.string().min(1, "Maintenance type is required"),
  scheduledDate: z.date().optional().nullable(),
  completedDate: z.date().optional().nullable(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  cost: z.coerce.number().min(0).optional().nullable(),
  performedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Define the props for the form
interface MaintenanceFormProps {
  record?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Maintenance type options
const MAINTENANCE_TYPES = [
  "Preventive",
  "Corrective",
  "Predictive",
  "Routine Check",
  "Hardware Upgrade",
  "Software Update",
  "Repair",
  "Inspection",
  "Cleaning",
  "Other",
];

// Status options
const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function MaintenanceForm({ record, onSuccess, onCancel }: MaintenanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch devices for selection
  const { data: devices = [], isLoading: isDevicesLoading } = useQuery<any[]>({
    queryKey: ['/api/devices'],
  });

  // Initialize form with defaults, set device ID after data is loaded
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deviceId: record?.deviceId || 0, // Will update this after devices load if needed
      description: record?.description || "",
      maintenanceType: record?.maintenanceType || MAINTENANCE_TYPES[0],
      scheduledDate: record?.scheduledDate ? new Date(record.scheduledDate) : null,
      completedDate: record?.completedDate ? new Date(record.completedDate) : null,
      status: record?.status || "scheduled",
      cost: record?.cost ? (record.cost / 100) : null, // Convert cents to dollars for display
      performedBy: record?.performedBy || "",
      notes: record?.notes || "",
    },
  });
  
  // Update deviceId default value when devices are loaded
  useEffect(() => {
    if (!record?.deviceId && Array.isArray(devices) && devices.length > 0 && !isDevicesLoading) {
      form.setValue('deviceId', devices[0].id);
    }
  }, [devices, isDevicesLoading, record, form]);

  // Watch status to conditionally show/hide completed date
  const watchStatus = form.watch("status");

  // Submit handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Format data to ensure dates are properly handled
      const formattedData = {
        ...values,
        scheduledDate: values.scheduledDate ? new Date(values.scheduledDate) : null,
        completedDate: values.completedDate ? new Date(values.completedDate) : null,
        cost: values.cost ? Math.round(values.cost * 100) : null, // Convert dollars to cents
        deviceId: values.deviceId ? parseInt(values.deviceId.toString()) : null,
      };
      
      if (record?.id) {
        // Update existing record
        await apiRequest({
          method: "PUT",
          url: `/api/maintenance/${record.id}`,
          data: formattedData
        });
      } else {
        // Create new record
        await apiRequest({
          method: "POST", 
          url: "/api/maintenance",
          data: formattedData
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting maintenance record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="deviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                defaultValue={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isDevicesLoading ? (
                    <SelectItem value="loading_devices" disabled>
                      Loading devices...
                    </SelectItem>
                  ) : !Array.isArray(devices) || devices.length === 0 ? (
                    <SelectItem value="no_devices" disabled>
                      No devices available
                    </SelectItem>
                  ) : (
                    devices.map((device: any) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.brand} {device.model} ({device.assetTag})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Annual hardware inspection" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maintenanceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select maintenance type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Scheduled Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          formatDate(field.value)
                        ) : (
                          <span>Select date</span>
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When the maintenance is scheduled
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {(watchStatus === "completed") && (
            <FormField
              control={form.control}
              name="completedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Completed Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            formatDate(field.value)
                          ) : (
                            <span>Select date</span>
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
                          date > new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When the maintenance was completed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value === null ? "" : field.value}
                  />
                </FormControl>
                <FormDescription>
                  Cost of maintenance (if applicable)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="performedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Performed By</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., IT Department or technician name"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Who performed or will perform the maintenance
                </FormDescription>
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
                  placeholder="Additional information about this maintenance task"
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : record ? "Update Record" : "Create Record"}
          </Button>
        </div>
      </form>
    </Form>
  );
}