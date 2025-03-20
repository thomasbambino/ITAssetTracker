import { MobileNav } from '@/components/layout/MobileNav';
import { ReactNode, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

interface AppLayoutProps {
  children: ReactNode;
}

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

export default function AppLayout({ children }: AppLayoutProps) {
  const [isReady, setIsReady] = useState(false);
  
  // Fetch branding data
  const { data: branding, isLoading, isSuccess } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Only show content when branding data is loaded
  useEffect(() => {
    if (isSuccess && branding) {
      // Small delay to ensure all data is processed
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isSuccess, branding]);
  
  // Show a loading indicator while waiting for branding data
  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-[300px] space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Navigation */}
      <MobileNav />
      
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none pt-2 pb-6">
        {children}
      </main>
    </div>
  );
}
