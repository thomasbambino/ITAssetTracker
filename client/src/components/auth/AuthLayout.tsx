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
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}