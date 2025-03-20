import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PageContainer } from "@/components/layout/PageContainer";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { EmailSettingsForm } from "@/components/forms/EmailSettingsForm";

export default function Settings() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: emailSettings, isLoading: emailLoading, refetch: refetchEmail } = useQuery({
    queryKey: ['/api/settings/email'],
    queryFn: async () => {
      try {
        return await apiRequest({
          url: '/api/settings/email',
          method: 'GET'
        });
      } catch (error) {
        return null;
      }
    }
  });

  const handleRefreshEmail = async () => {
    setIsRefreshing(true);
    try {
      await refetchEmail();
      toast({
        title: "Refreshed",
        description: "Email settings have been refreshed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh email settings.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEmailFormSuccess = () => {
    refetchEmail();
  };

  return (
    <PageContainer
      title="Settings"
      description="Configure system and user preferences"
    >
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="import">Import/Export</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input id="admin-email" type="email" placeholder="admin@example.com" />
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-assign">Auto-assign new devices</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign new devices to the IT department
                  </p>
                </div>
                <Switch id="auto-assign" />
              </div>
              
              <Button className="mt-4">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-0">
          <div className="grid gap-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Email settings are required for password reset functionality and system notifications.
                This application uses Mailgun for sending emails. You'll need a Mailgun account to configure these settings.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Configuration</CardTitle>
                    <CardDescription>
                      Configure the email service settings to enable email notifications and alerts
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleRefreshEmail}
                    disabled={isRefreshing || emailLoading}
                  >
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {emailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <EmailSettingsForm 
                    initialData={emailSettings} 
                    onSuccess={handleEmailFormSuccess} 
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Warranty Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when warranties are about to expire
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Assignment Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when devices are assigned or unassigned
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <Button className="mt-4">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="import" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Import/Export Settings</CardTitle>
              <CardDescription>
                Manage data import and export options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Import Data</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Import data from CSV files
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline">Import Users</Button>
                      <Button variant="outline">Import Devices</Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Export Data</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Export data to CSV files
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline">Export Users</Button>
                      <Button variant="outline">Export Devices</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}