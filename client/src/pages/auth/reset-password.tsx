import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { changePasswordSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, ServerIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface BrandingSettings {
  id?: number;
  companyName: string;
  logo?: string | null;
  primaryColor: string;
  accentColor?: string | null;
  siteNameColor?: string | null;
  siteNameColorSecondary?: string | null;
  siteNameGradient?: boolean | null;
  companyTagline?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
}

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Fetch branding settings
  const { data: brandingData, isLoading: isBrandingLoading } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Use actual branding data only when available
  const branding: BrandingSettings | null = brandingData || null;

  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof changePasswordSchema>) {
    setLoading(true);
    try {
      const data = await apiRequest({
        method: "POST", 
        url: "/api/auth/change-password", 
        data: values
      });

      if (data.success) {
        // Clear any user-related queries from the cache
        await queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
        
        toast({
          title: "Password changed",
          description: "Your password has been updated successfully",
        });

        navigate("/");
      } else {
        toast({
          title: "Failed to change password",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to change password",
        description: "An error occurred during password reset",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Show loading animation when branding data is loading
  if (isBrandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            {branding?.logo ? (
              <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center mr-2">
                <img 
                  src={branding.logo} 
                  alt="Company logo"
                  className="h-8 w-8 object-contain" 
                />
              </div>
            ) : (
              <div className="bg-primary p-1.5 rounded-md mr-2">
                <ServerIcon className="h-7 w-7 text-white" />
              </div>
            )}
            <h2 
              className={`text-2xl font-bold ${branding?.siteNameGradient ? 'bg-clip-text text-transparent' : ''}`}
              style={{
                color: branding?.siteNameGradient ? 'transparent' : (branding?.siteNameColor || '#1E40AF'),
                backgroundImage: branding?.siteNameGradient && branding?.siteNameColorSecondary
                  ? `linear-gradient(to right, ${branding?.siteNameColor || '#1E40AF'}, ${branding?.siteNameColorSecondary || '#3B82F6'})`
                  : 'none',
                backgroundClip: branding?.siteNameGradient ? 'text' : 'border-box',
                WebkitBackgroundClip: branding?.siteNameGradient ? 'text' : 'border-box'
              }}
            >
              Change Your Password
            </h2>
          </div>
          <CardDescription>You need to set a new password to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your temporary password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Choose a new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Contact your administrator if you are having issues resetting your password
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}