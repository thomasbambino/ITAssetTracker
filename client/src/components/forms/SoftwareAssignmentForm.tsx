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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Check, ChevronsUpDown, Laptop, User } from "lucide-react";
import { cn, formatDate, mapErrorMessage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown';

// Define the form schema
const formSchema = z.object({
  softwareId: z.number(),
  assignmentType: z.enum(["user", "device"]),
  userId: z.number().optional().nullable(),
  deviceId: z.number().optional().nullable(),
  assignedAt: z.date(),  // Keep as date for form handling
  notes: z.string().optional().nullable(),
}).refine(data => {
  // Ensure either userId or deviceId is provided based on assignmentType
  if (data.assignmentType === "user") {
    return !!data.userId;
  } else {
    return !!data.deviceId;
  }
}, {
  message: "You must select a user or device based on assignment type",
  path: ["userId", "deviceId"]
});

// Define the props for the form
interface SoftwareAssignmentFormProps {
  softwareId: number;
  assignmentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SoftwareAssignmentForm({ 
  softwareId, 
  assignmentId,
  onSuccess, 
  onCancel 
}: SoftwareAssignmentFormProps) {
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
  
  interface AssignmentType {
    id: number;
    softwareId: number;
    userId?: number;
    deviceId?: number;
    assignedAt: string;
    notes?: string;
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
  
  // Fetch unassigned devices for selection
  const { data: devicesData = [] } = useQuery<any[]>({
    queryKey: ['/api/devices'],
  });
  
  // Create a sorted copy of devices (alphabetically by brand/model)
  const devices = [...devicesData].sort((a: any, b: any) => {
    const deviceA = `${a.brand} ${a.model}`.toLowerCase();
    const deviceB = `${b.brand} ${b.model}`.toLowerCase();
    return deviceA.localeCompare(deviceB);
  });
  
  // Fetch assignment details if editing
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery<AssignmentType>({
    queryKey: ['/api/software-assignments', assignmentId],
    enabled: !!assignmentId,
  });
  
  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      softwareId,
      assignmentType: assignment ? (assignment.userId ? "user" : "device") : "user", // Default to "user" when creating new
      userId: assignment && assignment.userId ? assignment.userId : null,
      deviceId: assignment && assignment.deviceId ? assignment.deviceId : null,
      assignedAt: assignment && assignment.assignedAt ? new Date(assignment.assignedAt) : new Date(),
      notes: assignment && assignment.notes ? assignment.notes : "",
    },
  });
  
  // Watch assignment type to conditionally render fields
  const assignmentType = form.watch("assignmentType");
  
  // Submit handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Prepare the data for submission with proper date handling
      const dataToSubmit = {
        softwareId: values.softwareId ? parseInt(values.softwareId.toString()) : null,
        userId: values.assignmentType === "user" ? parseInt(values.userId!.toString()) : null,
        deviceId: values.assignmentType === "device" ? parseInt(values.deviceId!.toString()) : null,
        assignedAt: values.assignedAt ? values.assignedAt.toISOString() : new Date().toISOString(), // Convert to ISO string format
        notes: values.notes,
        assignedBy: undefined, // Let the server add the current user's ID
      };
      
      if (assignmentId) {
        // Update existing assignment
        await apiRequest({
          method: "PUT",
          url: `/api/software-assignments/${assignmentId}`,
          data: dataToSubmit
        });
        
        toast({
          title: "Software assignment updated",
          description: "The software assignment has been updated successfully.",
        });
      } else {
        // Create new assignment
        await apiRequest({
          method: "POST",
          url: "/api/software-assignments",
          data: dataToSubmit
        });
        
        toast({
          title: "Software assigned",
          description: "The software has been assigned successfully.",
        });
      }
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/software-assignments'] });
      queryClient.invalidateQueries({ queryKey: [`/api/software-assignments/software/${softwareId}`] });
      
      if (dataToSubmit.userId) {
        queryClient.invalidateQueries({ queryKey: ['/api/software-assignments/user', dataToSubmit.userId] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', dataToSubmit.userId] });
      }
      
      if (dataToSubmit.deviceId) {
        queryClient.invalidateQueries({ queryKey: ['/api/software-assignments/device', dataToSubmit.deviceId] });
        queryClient.invalidateQueries({ queryKey: ['/api/devices', dataToSubmit.deviceId] });
      }
      
      // Invalidate activity logs
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting software assignment:", error);
      toast({
        title: "Error",
        description: mapErrorMessage(error) || "Failed to save software assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
                    <User className="h-4 w-4 mr-2" />
                    Assign to User
                  </TabsTrigger>
                  <TabsTrigger value="device" className="flex items-center">
                    <Laptop className="h-4 w-4 mr-2" />
                    Assign to Device
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
            name="userId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Select User</FormLabel>
                <FormControl>
                  <CustomDropdown 
                    options={users.map(user => ({
                      id: user.id.toString(),
                      label: `${user.firstName} ${user.lastName}`,
                      sublabel: user.department || undefined
                    }))}
                    value={field.value ? field.value.toString() : ''}
                    onChange={(value) => field.onChange(parseInt(value.toString()))}
                    placeholder="Select a user"
                    searchPlaceholder="Search users..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="deviceId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Select Device</FormLabel>
                <FormControl>
                  <CustomDropdown 
                    options={devices.map(device => ({
                      id: device.id.toString(),
                      label: `${device.brand} ${device.model}`,
                      sublabel: device.assetTag || undefined
                    }))}
                    value={field.value ? field.value.toString() : ''}
                    onChange={(value) => field.onChange(parseInt(value.toString()))}
                    placeholder="Select a device"
                    searchPlaceholder="Search devices..."
                  />
                </FormControl>
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
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                When the software is assigned
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
                  placeholder="Additional information about this assignment"
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
            {isSubmitting ? "Saving..." : assignmentId ? "Update Assignment" : "Create Assignment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}