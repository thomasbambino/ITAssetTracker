import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

// Define the User type for type checking
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
  
  // Skip authentication checks if we're already on an auth page
  if (location.includes("/auth/")) {
    return <>{children}</>;
  }
  
  // Get the user data with a simple configuration
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ['/api/users/me'],
    retry: 1,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Log user data when loaded
  useEffect(() => {
    if (user) {
      console.log('User data loaded:', user);
    }
  }, [user]);
  
  // Show loading until the query is done
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (isError || !user) {
    console.log('User not authenticated, redirecting to login');
    return <Redirect to="/auth/login" />;
  }

  // Admin access required but user is not admin
  if (adminOnly && user.role !== 'admin') {
    console.log('User is not admin, redirecting to home');
    return <Redirect to="/" />;
  }

  // User needs to reset password
  if (user.passwordResetRequired) {
    console.log('Password reset required, redirecting');
    return <Redirect to="/auth/reset-password" />;
  }

  // User is authenticated and has proper permissions
  return <>{children}</>;
}