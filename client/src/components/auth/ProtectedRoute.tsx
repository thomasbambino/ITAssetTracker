import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

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
  const { data: user, isLoading, isError, error } = useQuery<User>({
    queryKey: ['/api/users/me'],
    retry: 3, // Retry up to 3 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  // For debugging
  useEffect(() => {
    if (isError) {
      console.error('Protected route auth error:', error);
    }
    if (user) {
      console.log('User data loaded:', user);
    }
  }, [isError, error, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (isError || !user) {
    return <Redirect to="/auth/login" />;
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