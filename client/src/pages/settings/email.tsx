import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EmailSettingsForm } from "@/components/forms/EmailSettingsForm";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EmailSettingsPage() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: emailSettings, isLoading, refetch } = useQuery({
    queryKey: ['/api/settings/email'],
    queryFn: async () => {
      try {
        const data = await apiRequest({
          url: `/api/settings/email`,
          method: "GET",
        });
        return data;
      } catch (error) {
        // If settings don't exist yet, return null
        return null;
      }
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
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

  const handleFormSuccess = () => {
    refetch();
  };

  return (
    <PageContainer 
      title="Email Settings" 
      description="Configure email service for notifications and alerts"
      actions={
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
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
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>
              Configure the email service settings to enable email notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <EmailSettingsForm 
                initialData={emailSettings} 
                onSuccess={handleFormSuccess} 
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}