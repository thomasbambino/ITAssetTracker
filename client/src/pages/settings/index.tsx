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
import { ArrowRight, Mail, Palette } from "lucide-react";
import { Link } from "wouter";

export default function Settings() {
  const { data: emailSettings } = useQuery({
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

  const { data: brandingSettings } = useQuery({
    queryKey: ['/api/branding'],
    queryFn: async () => {
      try {
        return await apiRequest({
          url: '/api/branding',
          method: 'GET'
        });
      } catch (error) {
        return null;
      }
    }
  });

  return (
    <PageContainer
      title="Settings"
      description="Configure system and user preferences"
    >
      <div className="grid gap-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/settings/email">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Mail className="mr-2 h-5 w-5" />
                    Email Settings
                  </CardTitle>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardDescription>
                  Configure email service for notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {emailSettings ? (
                    <div className="flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2 ${emailSettings.isEnabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span>{emailSettings.isEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full mr-2 bg-red-500"></div>
                      <span>Not configured</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/branding">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Palette className="mr-2 h-5 w-5" /> 
                    Branding Settings
                  </CardTitle>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardDescription>
                  Customize company branding and theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {brandingSettings ? (
                    <div className="flex items-center">
                      <div className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: brandingSettings.primaryColor }}></div>
                      <span>{brandingSettings.companyName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full mr-2 bg-blue-500"></div>
                      <span>Default branding</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
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