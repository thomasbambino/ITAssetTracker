import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import Warranties from "@/pages/warranties";
import Branding from "@/pages/branding";
import IntuneManagement from "@/pages/management/intune";
import DeviceManagement from "@/pages/management/status";
import Sites from "@/pages/sites";
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
  "/warranties",
  "/branding",
  "/reports",
  "/settings",
  "/history",
  "/management",
  "/sites",
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
      <Route path="/warranties" component={() => <ProtectedPageWrapper component={Warranties} adminRequired />} />
      <Route path="/branding" component={() => <ProtectedPageWrapper component={Branding} adminRequired />} />
      <Route path="/history" component={() => <ProtectedPageWrapper component={History} adminRequired />} />
      <Route path="/reports" component={() => <ProtectedPageWrapper component={Reports} adminRequired />} />
      <Route path="/settings" component={() => <ProtectedPageWrapper component={Settings} adminRequired />} />
      <Route path="/management/intune" component={() => <ProtectedPageWrapper component={IntuneManagement} adminRequired />} />
      <Route path="/management/status" component={() => <ProtectedPageWrapper component={DeviceManagement} adminRequired />} />
      <Route path="/sites" component={() => <ProtectedPageWrapper component={Sites} adminRequired />} />
      
      {/* Fallback to 404 - this is still inside the protected wrapper */}
      <Route component={() => <ProtectedPageWrapper component={NotFound} />} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();
  
  // If we're on an auth route, use the auth router
  if (location.startsWith("/auth/")) {
    return <AuthRouter />;
  }
  
  // Use our custom ProtectedRoute component which will:
  // 1. Check if user is authenticated
  // 2. If not, redirect to login page
  // 3. If yes, render the main app layout with main router inside
  return (
    <ProtectedRoute>
      <AppLayout>
        <MainRouter />
      </AppLayout>
    </ProtectedRoute>
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
