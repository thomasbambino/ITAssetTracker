import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface BrandingSettings {
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

interface BrandingContextType {
  brandingSettings: BrandingSettings;
  isLoading: boolean;
}

const defaultBranding: BrandingSettings = {
  companyName: 'IT Asset Manager',
  primaryColor: '#1E40AF',
  accentColor: '#1E293B',
  siteNameColor: '#1E40AF',
  siteNameColorSecondary: '#3B82F6',
  siteNameGradient: true,
};

const BrandingContext = createContext<BrandingContextType>({
  brandingSettings: defaultBranding,
  isLoading: false,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
  });

  const brandingSettings = data || defaultBranding;

  // Set up document title based on branding
  useEffect(() => {
    if (brandingSettings.companyName) {
      document.title = `${brandingSettings.companyName} - IT Asset Manager`;
    }
  }, [brandingSettings.companyName]);

  return (
    <BrandingContext.Provider value={{ brandingSettings, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}