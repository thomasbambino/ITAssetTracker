import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

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
  const [authChecked, setAuthChecked] = useState(false);
  
  // Get the user data with improved error handling
  const { data: user, isLoading, isError, error, refetch } = useQuery<User>({
    queryKey: ['/api/users/me'],
    retry: 2, // Only retry twice to avoid too many retries
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Handle error with useEffect instead of onError
  useEffect(() => {
    if (isError) {
      console.error('Protected route auth error:', error);
      // If the URL includes "/auth", don't attempt to redirect to avoid loops
      if (!location.includes("/auth/")) {
        setLocation("/auth/login");
      }
    }
  }, [isError, error, location, setLocation]);

  // For debugging
  useEffect(() => {
    if (user) {
      console.log('User data loaded:', user);
    }
  }, [user]);

  // Manually check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Direct API call to check authentication without using the cache
        const response = await fetch('/api/users/me', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store'
        });
        
        // If successful, invalidate the query to update the cache
        if (response.ok) {
          const userData = await response.json();
          console.log('Manual auth check succeeded:', userData);
          queryClient.setQueryData(['/api/users/me'], userData);
          await queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
        } else {
          console.error('Manual auth check failed:', response.status);
          // Only redirect if we're not already on an auth page
          if (!location.includes("/auth/")) {
            setLocation("/auth/login");
          }
        }
      } catch (error) {
        console.error('Error during manual auth check:', error);
      } finally {
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, [location, setLocation]);

  // Show loading until both the query is done and we've completed our manual auth check
  if (isLoading || !authChecked) {
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

  // Type guard to ensure user has expected properties
  const isValidUser = (user: any): user is User => {
    return user && 
           typeof user.id === 'number' && 
           typeof user.role === 'string' && 
           (user.passwordResetRequired === true || user.passwordResetRequired === false);
  };

  // Validate the user object
  if (!isValidUser(user)) {
    console.error('Invalid user data structure:', user);
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