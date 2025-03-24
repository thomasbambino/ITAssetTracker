import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import UserDetails from "@/pages/users/[id]";
import Devices from "@/pages/devices";
import DeviceDetails from "@/pages/devices/[id]";
import Categories from "@/pages/categories";
import Software from "@/pages/software";
import SoftwareDetails from "@/pages/software/[id]";
import History from "@/pages/history";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Maintenance from "@/pages/maintenance";
import Notifications from "@/pages/notifications";
import QrCodes from "@/pages/qrcodes";
import Branding from "@/pages/branding";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import LoginPage from "@/pages/auth/login";
import ResetPasswordPage from "@/pages/auth/reset-password";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { BrandingProvider } from "@/components/branding/BrandingContext";
import { FaviconManager } from "@/components/branding/FaviconManager";

// Routes that require admin privileges
const ADMIN_ROUTES = [
  "/users",
  "/categories",
  "/software",
  "/maintenance",
  "/qrcodes",
  "/branding",
  "/reports",
  "/settings",
  "/history",
];

function ProtectedPageWrapper({ component: Component, adminRequired = false }: { 
  component: React.ComponentType<any>, 
  adminRequired?: boolean 
}) {
  return (
    <ProtectedRoute adminOnly={adminRequired}>
      <Component />
    </ProtectedRoute>
  );
}

function AuthRouter() {
  return (
    <Switch>
      <Route path="/auth/login">
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </Route>
      <Route path="/auth/reset-password">
        <AuthLayout>
          <ResetPasswordPage />
        </AuthLayout>
      </Route>
    </Switch>
  );
}

function MainRouter() {
  const [location] = useLocation();
  const isAdminRoute = ADMIN_ROUTES.some(route => 
    location === route || location.startsWith(`${route}/`)
  );

  return (
    <Switch>
      <Route path="/" component={() => <ProtectedPageWrapper component={Dashboard} />} />
      <Route path="/users" component={() => <ProtectedPageWrapper component={Users} adminRequired />} />
      <Route path="/users/:id" component={() => <ProtectedPageWrapper component={UserDetails} adminRequired />} />
      <Route path="/devices" component={() => <ProtectedPageWrapper component={Devices} />} />
      <Route path="/devices/:id" component={() => <ProtectedPageWrapper component={DeviceDetails} />} />
      <Route path="/categories" component={() => <ProtectedPageWrapper component={Categories} adminRequired />} />
      <Route path="/software" component={() => <ProtectedPageWrapper component={Software} adminRequired />} />
      <Route path="/software/:id" component={() => <ProtectedPageWrapper component={SoftwareDetails} adminRequired />} />
      <Route path="/maintenance" component={() => <ProtectedPageWrapper component={Maintenance} adminRequired />} />
      <Route path="/notifications" component={() => <ProtectedPageWrapper component={Notifications} />} />
      <Route path="/qrcodes" component={() => <ProtectedPageWrapper component={QrCodes} adminRequired />} />
      <Route path="/branding" component={() => <ProtectedPageWrapper component={Branding} adminRequired />} />
      <Route path="/history" component={() => <ProtectedPageWrapper component={History} adminRequired />} />
      <Route path="/reports" component={() => <ProtectedPageWrapper component={Reports} adminRequired />} />
      <Route path="/settings" component={() => <ProtectedPageWrapper component={Settings} adminRequired />} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  // EMERGENCY FIX: Use localStorage to prevent infinite redirects 
  // and directly check if we're on an auth page
  const currentPath = window.location.pathname;
  const [location] = useLocation();
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  
  // Bypass auth check for auth routes
  if (currentPath.startsWith("/auth/")) {
    return <AuthRouter />;
  }
  
  // One-time auth check on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const userData = await response.json();
          // Set auth state and cache user data
          setIsAuth(true);
          queryClient.setQueryData(['/api/users/me'], userData);
        } else {
          setIsAuth(false);
          // Only redirect if we're not already on a login page
          if (!currentPath.startsWith("/auth/")) {
            // Use the native browser navigation to avoid React state issues
            window.location.href = '/auth/login';
          }
        }
      } catch (error) {
        setIsAuth(false);
        // Only redirect if we're not already on a login page
        if (!currentPath.startsWith("/auth/")) {
          window.location.href = '/auth/login';
        }
      }
    };
    
    checkAuth();
  }, [currentPath]);
  
  // Show loading state while checking auth
  if (isAuth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If not authenticated and not already redirecting, show loading
  // This will only show briefly before the redirect happens
  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // User is authenticated, render the main router
  return (
    <AppLayout>
      <MainRouter />
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <ThemeProvider>
          {/* FaviconManager updates favicon and document title based on branding */}
          <FaviconManager />
          <Router />
          <Toaster />
        </ThemeProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}

export default App;
