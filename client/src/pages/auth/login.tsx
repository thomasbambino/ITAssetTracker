import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { loginSchema } from "@shared/schema";
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
  companyTagline?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  siteNameColor?: string | null;
  siteNameColorSecondary?: string | null;
  siteNameGradient?: boolean | null;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Fetch branding settings
  const { data: brandingData, isLoading: brandingLoading } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Safely cast the data with reasonable defaults
  const branding: BrandingSettings = brandingData || {
    companyName: "IT Asset Management",
    primaryColor: "#1E40AF",
    logo: null,
    siteNameColor: "#1E40AF",
    siteNameColorSecondary: "#3B82F6", 
    siteNameGradient: true
  };

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setLoading(true);
    try {
      console.log("Attempting login with:", values.email);
      
      const data = await apiRequest({
        method: "POST", 
        url: "/api/auth/login", 
        data: values
      });

      console.log("Login response:", data);

      if (data.success) {
        toast({
          title: "Login successful",
          description: "Welcome to IT Asset Management System",
        });

        // Set user data in cache and invalidate queries
        if (data.user) {
          // Set the data directly
          queryClient.setQueryData(['/api/users/me'], data.user);
          
          // Invalidate to ensure fresh data on next request
          queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
          
          console.log("Updated user data in cache:", data.user);
        }

        // Immediate navigation based on password reset status with full page reload
        if (data.passwordResetRequired) {
          console.log("Redirecting to password reset page");
          // Use window.location.href for a full page load to reset everything
          window.location.href = "/auth/reset-password";
        } else {
          console.log("Redirecting to dashboard");
          // Use window.location.href for a full page load to reset everything
          window.location.href = "/";
        }
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "An error occurred during login";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      {brandingLoading ? (
        <div className="w-full max-w-md h-80 bg-card rounded-lg border border-border shadow-sm flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
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
                className="text-2xl font-bold" 
                style={{
                  color: branding.siteNameGradient ? 'transparent' : (branding.siteNameColor || '#1E40AF'),
                  backgroundImage: branding.siteNameGradient && branding.siteNameColorSecondary 
                    ? `linear-gradient(to right, ${branding.siteNameColor || '#1E40AF'}, ${branding.siteNameColorSecondary || '#3B82F6'})` 
                    : 'none',
                  backgroundClip: branding.siteNameGradient ? 'text' : 'border-box',
                  WebkitBackgroundClip: branding.siteNameGradient ? 'text' : 'border-box'
                }}
              >
                {branding.companyName}
              </h2>
            </div>
          </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Contact your administrator if you are unable to access your account
          </div>
        </CardFooter>
      </Card>
      )}
    </div>
  );
}