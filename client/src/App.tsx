import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/users" component={Users} />
      <Route path="/users/:id" component={UserDetails} />
      <Route path="/devices" component={Devices} />
      <Route path="/devices/:id" component={DeviceDetails} />
      <Route path="/categories" component={Categories} />
      <Route path="/software" component={Software} />
      <Route path="/software/:id" component={SoftwareDetails} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/qrcodes" component={QrCodes} />
      <Route path="/branding" component={Branding} />
      <Route path="/history" component={History} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// We no longer need the DataPrefetcher component as that logic
// has been moved to the AppLayout component

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Router />
      </AppLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
