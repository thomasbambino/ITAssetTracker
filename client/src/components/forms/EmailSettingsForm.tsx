import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

const formSchema = z.object({
  apiKey: z.string().optional(), // Allow empty API key to preserve existing key
  domain: z.string().min(1, "Domain is required"),
  fromEmail: z.string().email("Invalid email address"),
  fromName: z.string().min(1, "Sender name is required"),
  isEnabled: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface EmailSettingsFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export function EmailSettingsForm({ initialData, onSuccess }: EmailSettingsFormProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingReset, setIsTestingReset] = useState(false);
  const [isTestingWelcome, setIsTestingWelcome] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: (initialData?.apiKey && initialData?.apiKey.includes('•')) ? "" : (initialData?.apiKey || ""), // Don't pre-fill with masked API key
      domain: initialData?.domain || "",
      fromEmail: initialData?.fromEmail || "",
      fromName: initialData?.fromName || "",
      isEnabled: initialData?.isEnabled || false,
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        apiKey: (initialData.apiKey && initialData.apiKey.includes('•')) ? "" : (initialData.apiKey || ""), // Don't pre-fill with masked API key
        domain: initialData.domain || "",
        fromEmail: initialData.fromEmail || "",
        fromName: initialData.fromName || "",
        isEnabled: initialData.isEnabled || false,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    console.log('Form data being submitted:', data);
    try {
      const result = await apiRequest({
        url: `/api/settings/email`,
        method: "PUT",
        data,
      });
      
      toast({
        title: "Settings saved",
        description: "Email settings have been updated successfully.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    const values = form.getValues();
    setIsTesting(true);
    
    try {
      // First save the current settings
      await apiRequest({
        url: `/api/settings/email`,
        method: "PUT",
        data: values,
      });

      // Determine test email target - use custom test email if provided, otherwise use from email
      const targetEmail = testEmail.trim() || values.fromEmail;
      
      // Then send a test email
      const result = await apiRequest({
        url: `/api/settings/email/test`,
        method: "POST",
        data: { email: targetEmail },
      });
      
      if (result.success) {
        toast({
          title: "Test email sent",
          description: `A test email has been sent to ${targetEmail}. Check your inbox and spam folder.`,
        });
      } else {
        toast({
          title: "Test failed",
          description: result.message || "Failed to send test email. Please check your settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email. Please check your settings.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePasswordResetTest = async () => {
    const values = form.getValues();
    setIsTestingReset(true);
    
    try {
      // First save the current settings
      await apiRequest({
        url: `/api/settings/email`,
        method: "PUT",
        data: values,
      });

      // Determine test email target - use custom test email if provided, otherwise use logged-in user's email
      const targetEmail = testEmail.trim();
      
      // Send password reset test email to specified email
      const result = await apiRequest({
        url: `/api/settings/email/test-reset`,
        method: "POST",
        data: targetEmail ? { email: targetEmail } : {},
      });
      
      if (result.success) {
        toast({
          title: "Password reset test email sent",
          description: `A test password reset email has been sent to ${targetEmail || 'your account'}. Check your inbox and spam folder.`,
        });
      } else {
        toast({
          title: "Test failed",
          description: result.message || "Failed to send password reset test email. Please check your settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset test email. Please check your settings.",
        variant: "destructive",
      });
    } finally {
      setIsTestingReset(false);
    }
  };

  const handleWelcomeTest = async () => {
    const values = form.getValues();
    setIsTestingWelcome(true);
    
    try {
      // First save the current settings
      await apiRequest({
        url: `/api/settings/email`,
        method: "PUT",
        data: values,
      });

      // Determine test email target - use custom test email if provided, otherwise use logged-in user's email
      const targetEmail = testEmail.trim();
      
      // Send welcome test email to specified email
      const result = await apiRequest({
        url: `/api/settings/email/test-welcome`,
        method: "POST",
        data: targetEmail ? { email: targetEmail } : {},
      });
      
      if (result.success) {
        toast({
          title: "Welcome test email sent",
          description: `A test welcome email has been sent to ${targetEmail || 'your account'}. Check your inbox and spam folder.`,
        });
      } else {
        toast({
          title: "Test failed",
          description: result.message || "Failed to send welcome test email. Please check your settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send welcome test email. Please check your settings.",
        variant: "destructive",
      });
    } finally {
      setIsTestingWelcome(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mailgun API Key</FormLabel>
                <FormControl>
                  <Input
                    placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    {...field}
                    type="password"
                  />
                </FormControl>
                <FormDescription>
                  The API key from your Mailgun account
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mailgun Domain</FormLabel>
                <FormControl>
                  <Input placeholder="mg.example.com" {...field} />
                </FormControl>
                <FormDescription>
                  The domain configured in your Mailgun account
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fromEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Email</FormLabel>
                <FormControl>
                  <Input placeholder="noreply@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  The email address used as the sender
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fromName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your Company Name" {...field} />
                </FormControl>
                <FormDescription>
                  The name that will appear as the sender
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Email Service</FormLabel>
                  <FormDescription>
                    Turn on to enable sending emails from the system
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      console.log('Switch toggled:', checked);
                      field.onChange(checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="border-t pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Test Email Templates</h3>
              <p className="text-sm text-muted-foreground">
                Test different email templates to verify your settings are working correctly.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestEmail}
                disabled={isTesting || isSaving || isTestingReset || isTestingWelcome}
                className="w-full"
              >
                {isTesting ? "Sending..." : "Test Basic Email"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePasswordResetTest}
                disabled={isTestingReset || isSaving || isTesting || isTestingWelcome}
                className="w-full"
              >
                {isTestingReset ? "Sending..." : "Test Password Reset"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleWelcomeTest}
                disabled={isTestingWelcome || isSaving || isTesting || isTestingReset}
                className="w-full"
              >
                {isTestingWelcome ? "Sending..." : "Test Welcome Email"}
              </Button>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter test email address (optional)"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  type="email"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to send basic test to your email address. Password reset and welcome emails always go to your account.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </Form>
  );
}