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
import { CalendarIcon, Laptop, User } from "lucide-react";
import { cn, formatDate, mapErrorMessage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const formSchema = z.object({
  softwareId: z.number(),
  assignmentType: z.enum(["user", "device"]),
  userId: z.number().optional().nullable(),
  deviceId: z.number().optional().nullable(),
  assignmentDate: z.date(),
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
  
  // Fetch software details to get the name and other info
  const { data: software } = useQuery({
    queryKey: ['/api/software', softwareId],
  });
  
  // Fetch users for selection
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });
  
  // Fetch unassigned devices for selection
  const { data: devices = [] } = useQuery({
    queryKey: ['/api/devices'],
  });
  
  // Fetch assignment details if editing
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ['/api/software-assignments', assignmentId],
    enabled: !!assignmentId,
  });
  
  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      softwareId,
      assignmentType: assignment && assignment.userId ? "user" : "device",
      userId: assignment && assignment.userId ? assignment.userId : null,
      deviceId: assignment && assignment.deviceId ? assignment.deviceId : null,
      assignmentDate: assignment && assignment.assignedAt ? new Date(assignment.assignedAt) : new Date(),
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
        assignedAt: values.assignmentDate ? new Date(values.assignmentDate) : new Date(),
        notes: values.notes,
        // The server will automatically use the logged-in user as the assignedBy
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
      queryClient.invalidateQueries({ queryKey: ['/api/software-assignments/software', softwareId] });
      
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
                defaultValue={field.value} 
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
              <FormItem>
                <FormLabel>Select User</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value?.toString() || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!Array.isArray(users) || users.length === 0 ? (
                      <SelectItem value="no_users" disabled>
                        No users available
                      </SelectItem>
                    ) : (
                      users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName} {user.department ? `(${user.department})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="deviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Device</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value?.toString() || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!Array.isArray(devices) || devices.length === 0 ? (
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
        )}
        
        <FormField
          control={form.control}
          name="assignmentDate"
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