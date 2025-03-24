import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'user';
  passwordResetRequired: boolean;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  
  // Get the user data with improved error handling
  const { data: user, isLoading, isError, error, refetch } = useQuery<User>({
    queryKey: ['/api/users/me'],
    retry: 2, // Only retry twice to avoid too many retries
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      console.error('Protected route auth error:', error);
      // If the URL includes "/auth", don't attempt to redirect to avoid loops
      if (!location.includes("/auth/")) {
        setLocation("/auth/login");
      }
    }
  });

  // For debugging
  useEffect(() => {
    if (user) {
      console.log('User data loaded:', user);
    }
  }, [user]);

  // Force refresh of user data when component mounts
  useEffect(() => {
    // Initial fetch to ensure we have fresh data
    const fetchData = async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      } catch (error) {
        console.error('Error refreshing auth status:', error);
      }
    };
    
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (isError || !user) {
    // If we're already on an auth page, don't redirect to prevent loops
    if (!location.includes("/auth/")) {
      return <Redirect to="/auth/login" />;
    }
    // Just return null to avoid rendering loops if already on auth page
    return null;
  }

  // Admin access required but user is not admin
  if (adminOnly && user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  // User needs to reset password
  if (user.passwordResetRequired) {
    return <Redirect to="/auth/reset-password" />;
  }

  return <>{children}</>;
}