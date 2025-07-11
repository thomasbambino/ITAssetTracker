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
import { useState } from "react";

const formSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
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
  const [isSaving, setIsSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: initialData?.apiKey || "",
      domain: initialData?.domain || "",
      fromEmail: initialData?.fromEmail || "",
      fromName: initialData?.fromName || "",
      isEnabled: initialData?.isEnabled || false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
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
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="border-t pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Test Email Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Send a test email to verify your settings are working correctly.
              </p>
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
                  Leave empty to send to your configured "From Email" address
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestEmail}
                disabled={isTesting || isSaving}
              >
                {isTesting ? "Sending..." : "Send Test Email"}
              </Button>
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