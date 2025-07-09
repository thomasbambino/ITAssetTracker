import { ThemeToggle } from "../theme/ThemeToggle";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface BrandingSettings {
  id?: number;
  companyName: string;
  logo?: string | null;
  primaryColor: string;
  accentColor?: string | null;
}

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { data: branding, isLoading } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto p-4">
        <header className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-6 w-40" />
              </>
            ) : (
              <>
                {branding?.logo && (
                  <img
                    src={branding.logo}
                    alt={branding.companyName || "Company Logo"}
                    className="h-8 w-auto"
                  />
                )}
                {branding && (
                  <h1 className="text-xl font-bold text-foreground">
                    {branding.companyName}
                  </h1>
                )}
              </>
            )}
          </div>
          <ThemeToggle />
        </header>
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}