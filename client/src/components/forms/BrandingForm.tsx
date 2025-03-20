import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { AlertCircle, Building, Check, FileImage, Loader2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Form schema with validation
const formSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLogo: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Please enter a valid hex color code"),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Please enter a valid hex color code").optional().nullable(),
  companyTagline: z.string().optional().nullable(),
  supportEmail: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().email("Please enter a valid email address").optional().nullable()
  ),
  supportPhone: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface BrandingFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export function BrandingForm({ initialData, onSuccess }: BrandingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Create form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: initialData?.companyName || "",
      companyLogo: initialData?.companyLogo || "",
      primaryColor: initialData?.primaryColor || "#1E40AF",
      accentColor: initialData?.accentColor || "#1E293B",
      companyTagline: initialData?.companyTagline || "",
      supportEmail: initialData?.supportEmail || "",
      supportPhone: initialData?.supportPhone || "",
    },
  });

  // Submit handler
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    
    try {
      // If we have initial data, this is an update
      if (initialData?.id) {
        await apiRequest(
          "PUT",
          `/api/branding`,
          data
        );
      } else {
        // Otherwise, it's a create
        await apiRequest(
          "PUT",
          `/api/branding`,
          data
        );
      }
      
      // Show success message
      setFormSuccess("Branding settings saved successfully");
      
      // Invalidate query cache
      queryClient.invalidateQueries({ queryKey: ['/api/branding'] });
      
      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving branding settings:", error);
      setFormError("Error saving branding settings. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {formError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        
        {formSuccess && (
          <Alert variant="default" className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">{formSuccess}</AlertDescription>
          </Alert>
        )}
        
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Where do branding changes appear?</AlertTitle>
          <AlertDescription className="text-blue-700">
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Company name appears in the sidebar, header, and login screen</li>
              <li>Primary color is used for buttons, navigation items, and highlights throughout the app</li>
              <li>Accent color is used for text and secondary elements</li>
              <li>Support information appears in the help section and error pages</li>
              <li>Company logo (when implemented) will appear in headers, reports, and exports</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will appear throughout the application
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="companyTagline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Tagline (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Your company's mission or slogan" 
                      className="resize-none" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    A short slogan to appear alongside your company name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Logo Upload - In a real app, this would handle file uploads */}
            <FormField
              control={form.control}
              name="companyLogo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Logo (Optional)</FormLabel>
                  <Card className="p-4 border-dashed flex flex-col items-center justify-center">
                    {field.value ? (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center mb-3">
                          <FileImage className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">logo-filename.png</p>
                        <Button 
                          variant="outline" 
                          type="button" 
                          size="sm"
                          onClick={() => form.setValue('companyLogo', null)}
                        >
                          Remove Logo
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4">
                        <Building className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Drag and drop or click to upload
                        </p>
                        <Button 
                          variant="outline" 
                          type="button" 
                          size="sm"
                          onClick={() => alert("In a real app, this would open a file picker")}
                        >
                          Upload Logo
                        </Button>
                      </div>
                    )}
                  </Card>
                  <FormDescription>
                    Upload your company logo (SVG, PNG or JPG, max 2MB)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div
                          className="h-10 w-10 rounded border cursor-pointer hover:shadow-md transition-shadow"
                          style={{ backgroundColor: field.value || "#1E40AF" }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <HexColorPicker 
                          color={field.value || "#1E40AF"} 
                          onChange={(color) => field.onChange(color)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormDescription>
                    Main color for buttons, links and highlights (click color square to open color picker)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accentColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accent Color (Optional)</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div
                          className="h-10 w-10 rounded border cursor-pointer hover:shadow-md transition-shadow"
                          style={{ backgroundColor: field.value || "#1E293B" }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <HexColorPicker 
                          color={field.value || "#1E293B"} 
                          onChange={(color) => field.onChange(color)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormDescription>
                    Secondary color for text and other elements (click color square to open color picker)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="supportEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support Email (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="support@yourcompany.com" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Email address for support inquiries
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="supportPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="+1 (555) 123-4567" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Phone number for support inquiries
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save Branding Settings"}
          </Button>
        </div>
      </form>
    </Form>
  );
}