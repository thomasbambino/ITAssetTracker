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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Laptop, User, Users } from "lucide-react";
import { cn, formatDate, mapErrorMessage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MultiSelectDropdown, type DropdownOption } from '@/components/ui/multi-select-dropdown';
import { CustomDropdown } from '@/components/ui/custom-dropdown';

// Define the form schema for bulk assignment
const formSchema = z.object({
  softwareId: z.number(),
  assignmentType: z.enum(["user", "device"]),
  userIds: z.array(z.number()).optional().nullable(),
  deviceIds: z.array(z.number()).optional().nullable(),
  assignedAt: z.date(),
  notes: z.string().optional().nullable(),
}).refine(data => {
  // Ensure either userIds or deviceIds is provided based on assignmentType
  if (data.assignmentType === "user") {
    return data.userIds && data.userIds.length > 0;
  } else {
    return data.deviceIds && data.deviceIds.length > 0;
  }
}, {
  message: "You must select at least one user or device based on assignment type",
  path: ["userIds", "deviceIds"]
});

// Define the props for the form
interface BulkSoftwareAssignmentFormProps {
  softwareId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BulkSoftwareAssignmentForm({ 
  softwareId, 
  onSuccess, 
  onCancel 
}: BulkSoftwareAssignmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Define interfaces for our data types
  interface SoftwareType {
    id: number;
    name: string;
    vendor: string;
    licenseKey?: string;
    licenseType: string;
    seats?: number;
    cost?: number;
    status: string;
    version?: string;
  }
  
  // Fetch software details to get the name and other info
  const { data: software } = useQuery<SoftwareType>({
    queryKey: ['/api/software', softwareId],
  });
  
  // Fetch users for selection
  const { data: usersData = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });
  
  // Create a sorted copy of users (alphabetically by name)
  const users = [...usersData].sort((a: any, b: any) => {
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  // Fetch devices for selection
  const { data: devicesData = [] } = useQuery<any[]>({
    queryKey: ['/api/devices'],
  });
  
  // Create a sorted copy of devices (alphabetically by brand/model)
  const devices = [...devicesData].sort((a: any, b: any) => {
    const deviceA = `${a.brand} ${a.model}`.toLowerCase();
    const deviceB = `${b.brand} ${b.model}`.toLowerCase();
    return deviceA.localeCompare(deviceB);
  });
  
  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      softwareId,
      assignmentType: "user",
      userIds: [],
      deviceIds: [],
      assignedAt: new Date(),
      notes: "",
    },
  });
  
  // Watch assignment type to conditionally render fields
  const assignmentType = form.watch("assignmentType");
  
  // Submit handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Prepare array of assignments to create
      const assignments = [];
      
      if (values.assignmentType === "user" && values.userIds) {
        for (const userId of values.userIds) {
          assignments.push({
            softwareId: values.softwareId,
            userId: userId,
            deviceId: null,
            assignedAt: values.assignedAt.toISOString(),
            notes: values.notes || null,
          });
        }
      } else if (values.assignmentType === "device" && values.deviceIds) {
        for (const deviceId of values.deviceIds) {
          assignments.push({
            softwareId: values.softwareId,
            userId: null,
            deviceId: deviceId,
            assignedAt: values.assignedAt.toISOString(),
            notes: values.notes || null,
          });
        }
      }
      
      // Create all assignments in parallel
      const promises = assignments.map(assignment => 
        apiRequest({
          url: '/api/software-assignments',
          method: 'POST',
          data: assignment
        })
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: `Successfully created ${assignments.length} software assignment${assignments.length > 1 ? 's' : ''}.`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/software-assignments'] });
      queryClient.invalidateQueries({ queryKey: [`/api/software/${softwareId}/assignments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/software'] });
      
      // Invalidate user-specific queries if assigning to users
      if (values.assignmentType === "user" && values.userIds) {
        values.userIds.forEach(userId => {
          queryClient.invalidateQueries({ queryKey: ['/api/software-assignments/user', userId] });
          queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
        });
      }
      
      // Invalidate device-specific queries if assigning to devices
      if (values.assignmentType === "device" && values.deviceIds) {
        values.deviceIds.forEach(deviceId => {
          queryClient.invalidateQueries({ queryKey: ['/api/software-assignments/device', deviceId] });
          queryClient.invalidateQueries({ queryKey: ['/api/devices', deviceId] });
        });
      }
      
      // Invalidate activity logs
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating bulk software assignments:", error);
      toast({
        title: "Error",
        description: mapErrorMessage(error) || "Failed to create software assignments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transform users to dropdown options
  const userOptions: DropdownOption[] = users.map(user => ({
    id: user.id,
    label: `${user.firstName} ${user.lastName}`,
    sublabel: user.email
  }));

  // Transform devices to dropdown options
  const deviceOptions: DropdownOption[] = devices.map(device => ({
    id: device.id,
    label: `${device.brand} ${device.model}`,
    sublabel: device.assetTag || device.serialNumber || `ID: ${device.id}`
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {software && typeof software === 'object' && (
          <div className="border rounded-md p-3 mb-4 bg-muted/30">
            <h3 className="font-medium">Assigning Software:</h3>
            <p className="text-sm">
              {software && 'name' in software ? software.name : 'Unknown'} - 
              {software && 'licenseType' in software ? software.licenseType : 'Unknown'}
            </p>
            {software && 'seats' in software && software.seats && (
              <p className="text-xs text-muted-foreground mt-1">{software.seats} seats available</p>
            )}
          </div>
        )}
        
        <FormField
          control={form.control}
          name="assignmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignment Type</FormLabel>
              <Tabs 
                value={field.value} 
                defaultValue="user"
                className="w-full" 
                onValueChange={(value) => field.onChange(value as "user" | "device")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="user" className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Assign to Users
                  </TabsTrigger>
                  <TabsTrigger value="device" className="flex items-center">
                    <Laptop className="h-4 w-4 mr-2" />
                    Assign to Devices
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {assignmentType === "user" ? (
          <FormField
            control={form.control}
            name="userIds"
            render={({ field }) => {
              console.log('User field value:', field.value);
              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Select Users</FormLabel>
                  <FormControl>
                    <MultiSelectDropdown
                      options={userOptions}
                      value={field.value || []}
                      onChange={(value) => {
                        console.log('Form field onChange called with:', value);
                        field.onChange(value);
                      }}
                      placeholder="Select users to assign software to..."
                      searchPlaceholder="Search users..."
                      maxHeight="max-h-48"
                    />
                  </FormControl>
                  <FormDescription>
                    Select multiple users to assign this software to. You can search by name or email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        ) : (
          <FormField
            control={form.control}
            name="deviceIds"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Select Devices</FormLabel>
                <FormControl>
                  <MultiSelectDropdown
                    options={deviceOptions}
                    value={field.value || []}
                    onChange={(value) => field.onChange(value)}
                    placeholder="Select devices to assign software to..."
                    searchPlaceholder="Search devices..."
                    maxHeight="max-h-48"
                  />
                </FormControl>
                <FormDescription>
                  Select multiple devices to assign this software to. You can search by brand, model, or asset tag.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="assignedAt"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Assignment Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        formatDate(field.value)
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
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                When was this software assigned?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional notes about this assignment..."
                  className="min-h-[100px] resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Optional notes about the software assignment.
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating Assignments..." : "Create Assignments"}
          </Button>
        </div>
      </form>
    </Form>
  );
}