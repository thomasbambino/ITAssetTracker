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
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, ServerIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TwoFactorVerification from "@/components/auth/TwoFactorVerification";
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
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Fetch branding settings
  const { data: brandingData, isLoading: isBrandingLoading } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Use actual branding data only when available
  const branding: BrandingSettings | null = brandingData || null;

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
      const data = await apiRequest({
        method: "POST", 
        url: "/api/auth/login", 
        data: values
      });

      if (data.success) {
        if (data.requiresTwoFactor) {
          // Show 2FA verification form
          setRequiresTwoFactor(true);
        } else {
          // Complete login - No toast notification on login success
          
          // Add a small delay to allow session to be properly established
          setTimeout(() => {
            if (data.passwordResetRequired) {
              navigate("/auth/reset-password");
            } else {
              navigate("/");
            }
          }, 300);
        }
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      
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

  const handleTwoFactorSuccess = (result: any) => {
    setTwoFactorLoading(false);
    
    // Complete login
    setTimeout(() => {
      if (result.data?.user?.passwordResetRequired) {
        navigate("/auth/reset-password");
      } else {
        navigate("/");
      }
    }, 300);
  };

  const handleTwoFactorError = (error: string) => {
    setTwoFactorLoading(false);
    toast({
      title: "Verification failed",
      description: error,
      variant: "destructive",
    });
  };

  // Show 2FA verification form if required
  if (requiresTwoFactor) {
    return (
      <TwoFactorVerification
        onSuccess={handleTwoFactorSuccess}
        onError={handleTwoFactorError}
        isLoading={twoFactorLoading}
      />
    );
  }

  // Show loading skeleton when branding data is loading
  if (isBrandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Skeleton className="w-10 h-10 rounded-md mr-2" />
              <Skeleton className="h-8 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-4 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            {branding?.logo ? (
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-md flex items-center justify-center mr-2">
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
            {branding && (
              <h2 
                className="text-2xl font-bold text-foreground" 
                style={{
                  color: branding.siteNameGradient ? 'transparent' : 'var(--foreground)',
                  backgroundImage: branding.siteNameGradient && branding.siteNameColorSecondary 
                    ? `linear-gradient(to right, ${branding.siteNameColor || '#1E40AF'}, ${branding.siteNameColorSecondary || '#3B82F6'})` 
                    : 'none',
                  backgroundClip: branding.siteNameGradient ? 'text' : 'border-box',
                  WebkitBackgroundClip: branding.siteNameGradient ? 'text' : 'border-box'
                }}
              >
                {branding.companyName}
              </h2>
            )}
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
    </div>
  );
}