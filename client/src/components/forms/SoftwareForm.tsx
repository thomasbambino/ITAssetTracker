import { useState } from "react";
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
import { CalendarIcon, Mail, Bell, Upload, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  vendor: z.string().min(2, "Vendor name must be at least 2 characters"),
  licenseKey: z.string().optional().nullable(),
  purchaseDate: z.date().optional().nullable(),
  expiryDate: z.date().optional().nullable(),
  licenseType: z.string().min(1, "License type is required"),
  seats: z.coerce.number().int().optional().nullable(),
  cost: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(["active", "expired", "pending"]),
  notes: z.string().optional().nullable(),
  version: z.string().optional().nullable(),
  url: z.string().url("Please enter a valid URL").optional().nullable().or(z.literal("")),
  notificationEmail: z.string().email("Please enter a valid email").optional().nullable(),
  sendAccessNotifications: z.boolean().default(false),
  icon: z.string().optional().nullable(),
});

// Define the props for the form
interface SoftwareFormProps {
  software?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// License type options
const LICENSE_TYPES = [
  "Single License",
  "Multi-User License",
  "Site License",
  "Subscription",
  "Open Source",
  "Freeware",
  "Trial",
  "Enterprise",
  "Volume License",
  "Other",
];

// Status options
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "pending", label: "Pending" },
];

export function SoftwareForm({ software, onSuccess, onCancel }: SoftwareFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(software?.icon || null);

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB.');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setIconPreview(base64String);
        form.setValue('icon', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove icon
  const removeIcon = () => {
    setIconPreview(null);
    form.setValue('icon', '');
  };

  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: software?.name || "",
      vendor: software?.vendor || "",
      licenseKey: software?.licenseKey || "",
      purchaseDate: software?.purchaseDate ? new Date(software.purchaseDate) : null,
      expiryDate: software?.expiryDate ? new Date(software.expiryDate) : null,
      licenseType: software?.licenseType || "",
      seats: software?.seats || null,
      cost: software?.cost || null,
      status: software?.status || "active",
      notes: software?.notes || "",
      version: software?.version || "",
      url: software?.url || "",
      notificationEmail: software?.notificationEmail || "",
      sendAccessNotifications: software?.sendAccessNotifications || false,
      icon: software?.icon || "",
    },
  });

  // Submit handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      if (software?.id) {
        // Update existing software
        await apiRequest({
          method: "PUT",
          url: `/api/software/${software.id}`,
          data: values
        });
      } else {
        // Create new software
        await apiRequest({
          method: "POST",
          url: "/api/software",
          data: values
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting software:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Software Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Microsoft Office 365" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vendor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Microsoft" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="licenseType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select license type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LICENSE_TYPES.map((type) => (
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
            name="licenseKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Key</FormLabel>
                <FormControl>
                  <Input
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Leave blank if not applicable
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Version</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., 1.2.3"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Optional link to the software's website or documentation
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Icon upload field */}
        <FormField
          control={form.control}
          name="icon"
          render={() => (
            <FormItem>
              <FormLabel>Software Icon</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  {iconPreview ? (
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <img
                          src={iconPreview}
                          alt="Software icon preview"
                          className="h-12 w-12 rounded-md object-cover border"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeIcon}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove Icon
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <label className="cursor-pointer">
                        <div className="flex items-center space-x-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground">
                          <Upload className="h-4 w-4" />
                          <span>Upload Icon</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload a custom icon for this software (PNG, JPG, GIF - max 2MB)
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
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When the software was purchased
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expiry Date</FormLabel>
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
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When the license expires
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="seats"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Seats/Licenses</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1"
                    {...field}
                    value={field.value === null ? "" : field.value}
                  />
                </FormControl>
                <FormDescription>
                  How many users can use this license
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
                  Purchase or recurring cost
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
                  placeholder="Additional information about this software"
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="border p-4 rounded-md space-y-4 bg-muted/30">
          <h3 className="font-medium flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Email Notifications
          </h3>
          
          <FormField
            control={form.control}
            name="sendAccessNotifications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Access Change Notifications
                  </FormLabel>
                  <FormDescription>
                    Send email notifications when this software is assigned or unassigned
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notificationEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notification Email</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      placeholder="email@example.com"
                      {...field}
                      value={field.value || ""}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Email address to receive notifications about access changes
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : software ? "Update Software" : "Add Software"}
          </Button>
        </div>
      </form>
    </Form>
  );
}