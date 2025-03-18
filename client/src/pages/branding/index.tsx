import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingForm } from "@/components/forms/BrandingForm";
import { apiRequest } from "@/lib/queryClient";
import { Eye, PaintBucket, Image, Building, Check } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";

// Example theme options
const THEME_CHOICES = [
  { 
    name: "Corporate Blue", 
    colors: { 
      primary: "#1E40AF",
      background: "#F8FAFC",
      card: "#FFFFFF",
      text: "#1E293B",
      border: "#E2E8F0" 
    }
  },
  { 
    name: "Forest Green", 
    colors: { 
      primary: "#166534",
      background: "#F7FEE7",
      card: "#FFFFFF",
      text: "#1E293B",
      border: "#D9F99D" 
    }
  },
  { 
    name: "Royal Purple", 
    colors: { 
      primary: "#7E22CE",
      background: "#FAF5FF",
      card: "#FFFFFF",
      text: "#1E293B",
      border: "#E9D5FF" 
    }
  },
  { 
    name: "Bold Red", 
    colors: { 
      primary: "#BE123C",
      background: "#FFF1F2",
      card: "#FFFFFF",
      text: "#1E293B",
      border: "#FECDD3" 
    }
  },
  { 
    name: "Classic Dark", 
    colors: { 
      primary: "#4F46E5",
      background: "#1E293B",
      card: "#334155",
      text: "#F8FAFC",
      border: "#475569" 
    }
  },
];

// Define branding settings type
interface BrandingSettings {
  id?: number;
  companyName: string;
  companyLogo?: string | null;
  primaryColor: string;
  accentColor?: string | null;
  companyTagline?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  theme?: string | null;
}

export default function BrandingPage() {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();
  
  // Query for fetching branding settings
  const { data: brandingSettings, isLoading, refetch } = useQuery({
    queryKey: ['/api/branding'],
  });

  // Set active theme when data loads
  useEffect(() => {
    if (brandingSettings && brandingSettings.theme) {
      setActiveTheme(brandingSettings.theme);
    } else {
      setActiveTheme(THEME_CHOICES[0].name);
    }
  }, [brandingSettings]);

  // Apply theme
  const applyTheme = async (themeName: string) => {
    setIsApplying(true);
    try {
      const theme = THEME_CHOICES.find(t => t.name === themeName);
      if (!theme) return;
      
      // In a real implementation, this would update the branding settings and apply the theme
      await apiRequest(
        "PUT", 
        '/api/branding',
        {
          ...brandingSettings,
          theme: themeName,
          primaryColor: theme.colors.primary,
          accentColor: theme.colors.text,
        }
      );
      
      setActiveTheme(themeName);
      refetch();
      
      toast({
        title: "Theme Applied",
        description: `Successfully applied the ${themeName} theme`,
      });
    } catch (error) {
      console.error("Error applying theme:", error);
      toast({
        title: "Error",
        description: "Failed to apply the theme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Render theme preview
  const renderThemePreview = (theme: typeof THEME_CHOICES[0]) => {
    return (
      <div 
        className="p-4 border rounded-md cursor-pointer hover:shadow-md transition-shadow"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: activeTheme === theme.name ? theme.colors.primary : theme.colors.border,
          borderWidth: activeTheme === theme.name ? "2px" : "1px",
        }}
        onClick={() => applyTheme(theme.name)}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="font-medium" style={{ color: theme.colors.text }}>{theme.name}</div>
          {activeTheme === theme.name && (
            <span 
              className="flex items-center justify-center rounded-full h-5 w-5"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Check className="h-3 w-3 text-white" />
            </span>
          )}
        </div>
        
        <div className="flex space-x-2 mb-3">
          {Object.values(theme.colors).map((color, idx) => (
            <div 
              key={idx} 
              className="h-5 w-5 rounded-full border" 
              style={{ backgroundColor: color, borderColor: "#CBD5E1" }}
            />
          ))}
        </div>
        
        <div 
          className="p-2 rounded-md mb-2" 
          style={{ backgroundColor: theme.colors.card, color: theme.colors.text }}
        >
          <div className="h-2 w-16 rounded mb-1" style={{ backgroundColor: theme.colors.primary }}></div>
          <div className="h-2 w-24 rounded mb-1" style={{ backgroundColor: theme.colors.border }}></div>
          <div className="h-2 w-20 rounded" style={{ backgroundColor: theme.colors.border }}></div>
        </div>
        
        <button 
          className="text-xs py-1 px-2 rounded flex items-center justify-center w-full mt-2" 
          style={{ 
            backgroundColor: theme.colors.primary, 
            color: "white",
            cursor: "pointer",
          }}
          disabled={activeTheme === theme.name || isApplying}
        >
          {activeTheme === theme.name ? "Active" : "Apply Theme"}
        </button>
      </div>
    );
  };

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
          <TabsTrigger value="themes">
            <PaintBucket className="h-4 w-4 mr-2" />
            Themes
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
        
        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Selection</CardTitle>
              <CardDescription>
                Choose from pre-designed themes to customize the look and feel of your system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {THEME_CHOICES.map((theme) => (
                  <div key={theme.name}>
                    {renderThemePreview(theme)}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <p className="text-sm text-muted-foreground">
                Theme changes will be visible throughout the application.
              </p>
            </CardFooter>
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
                        {brandingSettings?.companyLogo ? (
                          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center mr-3">
                            <Image className="h-6 w-6 text-primary" />
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