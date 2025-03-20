import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

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
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ['/api/users/me'],
    retry: false,
  });

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