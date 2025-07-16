import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoaderIcon, BrainIcon, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery as useAuthQuery } from "@tanstack/react-query";
import { FileUpload } from "@/components/ui/file-upload";

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

interface ProblemAnalysis {
  category: 'hardware' | 'software' | 'network' | 'access' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedAssignee: string;
  tags: string[];
  confidence: number;
  reasoning: string;
}

interface ProblemReportFormProps {
  onSuccess?: () => void;
}

export function ProblemReportForm({ onSuccess }: ProblemReportFormProps) {
  const [reportType, setReportType] = useState<"device" | "software" | "">("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<ProblemAnalysis | null>(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
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

  // AI Analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; deviceType?: string; softwareName?: string }) => {
      const response = await apiRequest('/api/problem-reports/analyze', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: (data) => {
      try {
        setAiAnalysis(data);
        setShowAiSuggestions(true);
      } catch (error) {
        console.error('Error setting AI analysis result:', error);
      }
    },
    onError: (error) => {
      console.error('AI analysis error:', error);
      // Silently fail AI analysis - don't show error to user since it's optional
      setAiAnalysis(null);
      setShowAiSuggestions(false);
    }
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: ProblemReportFormData) => {
      // First create the problem report
      const response = await apiRequest({
        url: '/api/problem-reports',
        method: 'POST',
        data: data,
      });
      
      // If there are attachments, upload them
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file) => {
          formData.append('files', file);
        });
        
        await apiRequest({
          url: `/api/problem-reports/${response.id}/attachments`,
          method: "POST",
          data: formData,
          headers: {
            // Don't set Content-Type header - let the browser set it for FormData
          },
        });
      }
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Problem Report Submitted",
        description: "Your problem report has been sent to the administrators. They will review it and get back to you soon.",
      });
      form.reset();
      setReportType("");
      setAttachments([]);
      setAiAnalysis(null);
      setShowAiSuggestions(false);
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
    try {
      setReportType(type);
      form.setValue("type", type);
      form.setValue("itemId", ""); // Reset item selection when type changes
      setAiAnalysis(null);
      setShowAiSuggestions(false);
    } catch (error) {
      console.error('Error changing report type:', error);
    }
  };

  // Trigger AI analysis when subject and description have sufficient content
  useEffect(() => {
    try {
      const subject = form.watch("subject");
      const description = form.watch("description");
      const itemId = form.watch("itemId");
      
      if (subject && description && subject.length > 5 && description.length > 20) {
        const timeoutId = setTimeout(() => {
          try {
            let deviceType = "";
            let softwareName = "";
            
            if (reportType === "device" && itemId && assignedDevices) {
              const device = assignedDevices.find(d => d.id === parseInt(itemId));
              if (device) {
                deviceType = `${device.brand || 'Unknown Brand'} ${device.model || 'Unknown Model'}`;
              }
            } else if (reportType === "software" && itemId && assignedSoftware) {
              const software = assignedSoftware.find(s => s.software && s.software.id === parseInt(itemId));
              if (software && software.software) {
                softwareName = software.software.name || 'Unknown Software';
              }
            }
            
            aiAnalysisMutation.mutate({
              title: subject,
              description: description,
              deviceType,
              softwareName
            });
          } catch (error) {
            console.error('Error in AI analysis timeout:', error);
          }
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error in AI analysis useEffect:', error);
    }
  }, [form.watch("subject"), form.watch("description"), form.watch("itemId"), reportType, assignedDevices, assignedSoftware]);

  const applyAiSuggestions = () => {
    if (aiAnalysis) {
      form.setValue("priority", aiAnalysis.priority);
      setShowAiSuggestions(false);
      toast({
        title: "AI Suggestions Applied",
        description: `Priority set to ${aiAnalysis.priority} based on AI analysis.`,
      });
    }
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
                        {device.brand || 'Unknown Brand'} {device.model || 'Unknown Model'} {device.assetTag ? `(${device.assetTag})` : ""}
                      </SelectItem>
                    ))}
                    {reportType === "software" && assignedSoftware.map((assignment) => (
                      <SelectItem key={assignment.software?.id || assignment.id} value={assignment.software?.id?.toString() || assignment.id.toString()}>
                        {assignment.software?.name || 'Unknown Software'} ({assignment.software?.vendor || 'Unknown Vendor'})
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

        {/* AI Analysis Loading */}
        {aiAnalysisMutation.isPending && (
          <Alert>
            <BrainIcon className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              Analyzing problem with AI...
            </AlertDescription>
          </Alert>
        )}

        {/* AI Suggestions */}
        {showAiSuggestions && aiAnalysis && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <BrainIcon className="h-5 w-5" />
                AI Analysis & Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Category</div>
                  <Badge variant="outline" className="capitalize">
                    {aiAnalysis.category}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Suggested Priority</div>
                  <Badge className={getPriorityColor(aiAnalysis.priority)}>
                    {aiAnalysis.priority.charAt(0).toUpperCase() + aiAnalysis.priority.slice(1)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Suggested Team</div>
                  <Badge variant="secondary">
                    {aiAnalysis.suggestedAssignee}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Confidence</div>
                  <Badge variant="outline">
                    {Math.round(aiAnalysis.confidence * 100)}%
                  </Badge>
                </div>
              </div>

              {aiAnalysis.tags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Suggested Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {aiAnalysis.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Analysis Reasoning</div>
                <p className="text-sm text-gray-600">{aiAnalysis.reasoning}</p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Info className="h-4 w-4" />
                  AI suggestions are based on problem description analysis
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAiSuggestions(false)}
                  >
                    Dismiss
                  </Button>
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={applyAiSuggestions}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Apply Priority
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Attachments */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Attachments (optional)</label>
          <p className="text-sm text-muted-foreground">
            Upload screenshots, photos, or PDF documents that help explain the problem
          </p>
          <FileUpload 
            files={attachments} 
            onChange={setAttachments} 
            maxFiles={5}
            maxSize={10 * 1024 * 1024} // 10MB
            accept=".jpg,.jpeg,.png,.gif,.pdf"
          />
        </div>

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