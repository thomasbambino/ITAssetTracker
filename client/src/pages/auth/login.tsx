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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-6 pb-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </CardContent>
          <CardFooter className="px-8 pb-8">
            <Skeleton className="h-4 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="space-y-6 pb-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-3">
              {branding?.logo ? (
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-center">
                  <img 
                    src={branding.logo} 
                    alt="Company logo"
                    className="h-8 w-8 object-contain" 
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl shadow-lg">
                  <ServerIcon className="h-6 w-6 text-white" />
                </div>
              )}
              {branding && (
                <h1 
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
                </h1>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
              <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your email" 
                        {...field} 
                        className="h-12 px-4 rounded-lg border-2 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      />
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
                    <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your password" 
                        {...field} 
                        className="h-12 px-4 rounded-lg border-2 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
                disabled={loading}
              >
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
        <CardFooter className="px-8 pb-8">
          <div className="w-full text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact your administrator if you are unable to access your account
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}