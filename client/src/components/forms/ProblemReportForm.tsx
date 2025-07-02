import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoaderIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery as useAuthQuery } from "@tanstack/react-query";

// Define the form schema
const problemReportSchema = z.object({
  type: z.enum(["device", "software"], {
    required_error: "Please select a problem type",
  }),
  itemId: z.string().min(1, "Please select an item"),
  subject: z.string().min(1, "Subject is required").max(100, "Subject must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    required_error: "Please select a priority level",
  }),
});

type ProblemReportFormData = z.infer<typeof problemReportSchema>;

interface Device {
  id: number;
  name: string;
  brand: string;
  model: string;
  assetTag: string | null;
}

interface Software {
  id: number;
  name: string;
  vendor: string;
}

interface ProblemReportFormProps {
  onSuccess?: () => void;
}

export function ProblemReportForm({ onSuccess }: ProblemReportFormProps) {
  const [reportType, setReportType] = useState<"device" | "software" | "">("");
  const { toast } = useToast();

  // Get current user from API
  const { data: user } = useAuthQuery<{ id: number } | null>({
    queryKey: ['/api/users/me'],
    staleTime: 60 * 1000,
  });

  // Form setup
  const form = useForm<ProblemReportFormData>({
    resolver: zodResolver(problemReportSchema),
    defaultValues: {
      type: undefined,
      itemId: "",
      subject: "",
      description: "",
      priority: "medium",
    },
  });

  // Fetch user's assigned devices
  const { data: assignedDevices = [] } = useQuery<Device[]>({
    queryKey: ['/api/devices/assigned'],
    enabled: !!user?.id && reportType === "device",
  });

  // Fetch user's assigned software
  const { data: assignedSoftware = [] } = useQuery<any[]>({
    queryKey: [`/api/software-assignments/user/${user?.id}`],
    enabled: !!user?.id && reportType === "software",
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: ProblemReportFormData) => {
      return apiRequest({
        url: '/api/problem-reports',
        method: 'POST',
        data: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Problem Report Submitted",
        description: "Your problem report has been sent to the administrators. They will review it and get back to you soon.",
      });
      form.reset();
      setReportType("");
      onSuccess?.();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to submit problem report. Please try again.",
      });
    },
  });

  const onSubmit = (data: ProblemReportFormData) => {
    submitMutation.mutate(data);
  };

  const handleTypeChange = (type: "device" | "software") => {
    setReportType(type);
    form.setValue("type", type);
    form.setValue("itemId", ""); // Reset item selection when type changes
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-blue-100 text-blue-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "urgent": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Problem Type Selection */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What type of problem are you reporting?</FormLabel>
              <Select onValueChange={handleTypeChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select problem type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="device">Device Problem</SelectItem>
                  <SelectItem value="software">Software Problem</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Item Selection */}
        {reportType && (
          <FormField
            control={form.control}
            name="itemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Select {reportType === "device" ? "Device" : "Software"}
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={`Select ${reportType === "device" ? "device" : "software"}`} 
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {reportType === "device" && assignedDevices.map((device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.brand} {device.model} {device.assetTag ? `(${device.assetTag})` : ""}
                      </SelectItem>
                    ))}
                    {reportType === "software" && assignedSoftware.map((assignment) => (
                      <SelectItem key={assignment.software.id} value={assignment.software.id.toString()}>
                        {assignment.software.name} ({assignment.software.vendor})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Subject */}
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Brief description of the problem" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority Level</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor("low")}>Low</Badge>
                      <span>Can wait - not urgent</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor("medium")}>Medium</Badge>
                      <span>Normal priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor("high")}>High</Badge>
                      <span>Important - needs attention</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor("urgent")}>Urgent</Badge>
                      <span>Critical - immediate attention</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Problem Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please describe the problem in detail. Include any error messages, when it started, and steps you've already tried."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={submitMutation.isPending}>
            {submitMutation.isPending && (
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Problem Report
          </Button>
        </div>
      </form>
    </Form>
  );
}