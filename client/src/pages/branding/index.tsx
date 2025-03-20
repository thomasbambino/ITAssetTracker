import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingForm } from "@/components/forms/BrandingForm";
import { Eye, Building } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";

// Define branding settings type
interface BrandingSettings {
  id?: number;
  companyName: string;
  logo?: string | null;
  primaryColor: string;
  accentColor?: string | null;
  companyTagline?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
}

export default function BrandingPage() {
  const { toast } = useToast();
  
  // Query for fetching branding settings
  const { data: brandingSettings, isLoading, refetch } = useQuery({
    queryKey: ['/api/branding'],
  });

  return (
    <PageContainer
      title="Branding & Customization"
      description="Configure your organization's appearance and identity settings"
    >
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">
            <Building className="h-4 w-4 mr-2" />
            Company Details
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Branding</CardTitle>
              <CardDescription>
                Configure your organization's branding settings to customize the appearance of the IT Asset Management System.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BrandingForm
                initialData={brandingSettings}
                onSuccess={() => {
                  toast({
                    title: "Settings Updated",
                    description: "Branding settings have been updated successfully.",
                  });
                  refetch();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branding Preview</CardTitle>
              <CardDescription>
                See how your branding will appear across the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading preview...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header Preview */}
                  <div className="border rounded-md overflow-hidden">
                    <div className="p-4 bg-primary flex items-center justify-between" style={{ backgroundColor: brandingSettings?.primaryColor || "#1E40AF" }}>
                      <div className="flex items-center">
                        {brandingSettings?.logo ? (
                          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center mr-3">
                            <img 
                              src={brandingSettings.logo} 
                              alt="Company logo"
                              className="h-6 w-6 object-contain" 
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center mr-3">
                            <Building className="h-6 w-6" style={{ color: brandingSettings?.primaryColor || "#1E40AF" }} />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-white">{brandingSettings?.companyName || "Your Company"}</h3>
                          {brandingSettings?.companyTagline && (
                            <p className="text-xs text-white/80">{brandingSettings.companyTagline}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Content Preview */}
                    <div className="p-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-medium mb-1" style={{ color: brandingSettings?.accentColor || "#1E293B" }}>
                          Dashboard
                        </h3>
                        <div className="h-2 w-24 rounded-full" style={{ backgroundColor: brandingSettings?.primaryColor || "#1E40AF" }}></div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="border rounded-md p-3">
                            <div className="h-2 w-16 rounded-full mb-2" style={{ backgroundColor: brandingSettings?.primaryColor || "#1E40AF", opacity: 0.7 }}></div>
                            <div className="h-2 w-12 rounded-full" style={{ backgroundColor: brandingSettings?.accentColor || "#1E293B", opacity: 0.2 }}></div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="h-3 w-32 rounded-full" style={{ backgroundColor: brandingSettings?.accentColor || "#1E293B", opacity: 0.2 }}></div>
                          <div className="h-6 w-20 rounded-md" style={{ backgroundColor: brandingSettings?.primaryColor || "#1E40AF" }}></div>
                        </div>
                        <div className="border-t pt-3">
                          <div className="h-2 w-full rounded-full mb-2" style={{ backgroundColor: brandingSettings?.accentColor || "#1E293B", opacity: 0.1 }}></div>
                          <div className="h-2 w-full rounded-full mb-2" style={{ backgroundColor: brandingSettings?.accentColor || "#1E293B", opacity: 0.1 }}></div>
                          <div className="h-2 w-3/4 rounded-full" style={{ backgroundColor: brandingSettings?.accentColor || "#1E293B", opacity: 0.1 }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer Preview */}
                  {(brandingSettings?.supportEmail || brandingSettings?.supportPhone) && (
                    <div className="border rounded-md p-3 bg-muted/30">
                      <h4 className="text-sm font-medium mb-1">Support Information</h4>
                      {brandingSettings.supportEmail && (
                        <p className="text-xs text-muted-foreground">Email: {brandingSettings.supportEmail}</p>
                      )}
                      {brandingSettings.supportPhone && (
                        <p className="text-xs text-muted-foreground">Phone: {brandingSettings.supportPhone}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}